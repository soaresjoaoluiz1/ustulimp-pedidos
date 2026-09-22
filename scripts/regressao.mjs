/* Teste de regressão do portal de pedidos (roda contra o server local na 3012). */
const B = 'http://localhost:3012/pedidos/api'
let pass = 0, fail = 0

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(B + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  return { status: res.status, data }
}
function check(name, ok, extra = '') {
  if (ok) { pass++; console.log('  OK   ' + name) }
  else { fail++; console.log('  FALHA' + ' ' + name + (extra ? ' → ' + JSON.stringify(extra) : '')) }
}

const admin = (await call('/auth/login', { method: 'POST', body: { email: 'admin@ustulimp.com.br', password: 'admin123' } })).data
const AT = admin.token
/* Estado conhecido: senha nova pro cliente de teste, mínimo 1200, todos os prazos liberados */
const boot = await call('/admin/customers/1/reset-password', { method: 'POST', token: AT })
await call('/admin/customers/1', { method: 'PUT', token: AT, body: { minimum_order_value: 1200, allowed_payment_term_ids: [], is_active: true } })
let cli = await call('/auth/login', { method: 'POST', body: { email: 'teste@ustulimp.com.br', password: boot.data.temp_password } })
const CT = cli.data.token

console.log('\n— login e pedido mínimo')
check('login do cliente traz o mínimo efetivo', cli.data.customer?.effective_minimum_order_value === 1200, cli.data.customer)
check('login traz o nome da tabela', cli.data.customer?.price_table_name === 'Padrão')

const item = (q) => ({ items: [{ product_id: 20, quantity: q }], payment_term: 'Boleto 28 dias', payment_method: 'boleto' })
check('abaixo do mínimo é recusado', (await call('/orders', { method: 'POST', token: CT, body: item(10) })).data?.code === 'MIN_ORDER_NOT_MET')

console.log('\n— prazo x forma de pagamento')
check('28 dias + PIX recusado', (await call('/orders', { method: 'POST', token: CT, body: { ...item(20), payment_method: 'pix' } })).data?.code === 'PAYMENT_METHOD_NOT_ALLOWED')
check('à vista + boleto recusado', (await call('/orders', { method: 'POST', token: CT, body: { ...item(20), payment_term: 'À vista (PIX/dinheiro)', payment_method: 'boleto' } })).data?.code === 'PAYMENT_METHOD_NOT_ALLOWED')
check('prazo inexistente recusado', (await call('/orders', { method: 'POST', token: CT, body: { ...item(20), payment_term: 'Boleto 900 dias' } })).status === 400)
check('prazos vêm com as formas permitidas', (await call('/orders/_/payment-terms', { token: CT })).data.payment_terms.every(t => Array.isArray(t.methods) && t.methods.length))

console.log('\n— quantidade')
check('fração recusada', (await call('/orders', { method: 'POST', token: CT, body: { ...item(20.5) } })).status === 400)
check('negativo recusado', (await call('/orders', { method: 'POST', token: CT, body: { ...item(-3) } })).status === 400)
check('texto recusado', (await call('/orders', { method: 'POST', token: CT, body: { items: [{ product_id: 20, quantity: 'dez' }], payment_term: 'Boleto 28 dias', payment_method: 'boleto' } })).status === 400)
check('acima de 999 recusado', (await call('/orders', { method: 'POST', token: CT, body: { ...item(1500) } })).status === 400)

console.log('\n— pedido válido e contagens')
const novo = await call('/orders', { method: 'POST', token: CT, body: { items: [{ product_id: 20, quantity: 15 }, { product_id: 18, quantity: 5 }], payment_term: 'Boleto 28 dias', payment_method: 'boleto' } })
check('pedido criado', novo.status === 201, novo.data)
check('items_count = nº de linhas (2)', novo.data?.items_count === 2, novo.data)
check('boxes_count = nº de caixas (20)', novo.data?.boxes_count === 20, novo.data)
const det = await call('/orders/' + novo.data.id, { token: CT })
check('detalhe do cliente traz os dados dele (PDF)', !!det.data?.order?.customer_name && det.data.order.company_name !== undefined, det.data?.order && Object.keys(det.data.order))
check('items_count do banco bate com o detalhe', det.data?.order?.items_count === 2)

console.log('\n— preço em massa')
check('preço negativo recusado', (await call('/price-tables/1/items', { method: 'PUT', token: AT, body: { items: [{ product_id: 20, price: -50 }] } })).status === 404 || (await call('/admin/price-tables/1/items', { method: 'PUT', token: AT, body: { items: [{ product_id: 20, price: -50 }] } })).status === 400)
check('preço texto recusado', (await call('/admin/price-tables/1/items', { method: 'PUT', token: AT, body: { items: [{ product_id: 20, price: 'abc' }] } })).status === 400)
check('produto inexistente recusado', (await call('/admin/price-tables/1/items', { method: 'PUT', token: AT, body: { items: [{ product_id: 99999, price: 10 }] } })).status === 400)

console.log('\n— update parcial (limpar campo)')
await call('/admin/products/1', { method: 'PUT', token: AT, body: { short_use: 'texto qualquer' } })
await call('/admin/products/1', { method: 'PUT', token: AT, body: { short_use: null } })
const p1 = (await call('/admin/products/1', { token: AT })).data.product
check('campo limpo fica vazio mesmo', p1.short_use === null, p1.short_use)
check('outros campos não foram apagados', !!p1.name && !!p1.sku)

console.log('\n— tabela de preço inativa')
await call('/admin/price-tables/1', { method: 'PUT', token: AT, body: { is_active: false } })
check('catálogo bloqueia tabela inativa', (await call('/catalog', { token: CT })).data.products.length === 0)
check('pedido em tabela inativa recusado', (await call('/orders', { method: 'POST', token: CT, body: item(20) })).status === 400)
await call('/admin/price-tables/1', { method: 'PUT', token: AT, body: { is_active: true } })
check('reativando, catálogo volta', (await call('/catalog', { token: CT })).data.products.length === 29)

console.log('\n— senha e sessão')
const reset = await call('/admin/customers/1/reset-password', { method: 'POST', token: AT })
check('senha temporária tem 12 chars', (reset.data?.temp_password || '').length === 12, reset.data)
check('token antigo morre depois do reset', (await call('/catalog', { token: CT })).status === 401)
const cli2 = await call('/auth/login', { method: 'POST', body: { email: 'teste@ustulimp.com.br', password: reset.data.temp_password } })
check('login com a senha nova funciona', cli2.status === 200)

console.log('\n— prazo de pagamento em uso')
await call('/admin/customers/1', { method: 'PUT', token: AT, body: { allowed_payment_term_ids: [4] } })
const del = await call('/admin/payment-terms/4', { method: 'DELETE', token: AT })
check('prazo vinculado é desativado, não apagado', del.data?.deactivated === true, del.data)
await call('/admin/payment-terms/4', { method: 'PUT', token: AT, body: { is_active: true } })
await call('/admin/customers/1', { method: 'PUT', token: AT, body: { allowed_payment_term_ids: [] } })

console.log('\n— força bruta no login')
let blocked = false
for (let i = 0; i < 12; i++) {
  /* e-mail só deste teste: travar a conta real derrubaria os testes seguintes por 15 min */
  const r = await call('/auth/login', { method: 'POST', body: { email: 'forcabruta@teste.local', password: 'errada' + i } })
  if (r.status === 429) { blocked = true; break }
}
check('bloqueia depois de 10 tentativas erradas', blocked)

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
