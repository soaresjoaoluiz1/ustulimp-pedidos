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
const TABELA_ID = cli.data.customer?.price_table_id
const TABELA_NOME = cli.data.customer?.price_table_name
check('login traz o nome da tabela', !!TABELA_NOME, cli.data.customer)
const PRODUTOS_NA_TABELA = (await call('/catalog', { token: CT })).data.products.length
check('catálogo do cliente tem produtos', PRODUTOS_NA_TABELA > 0)

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
check('preço negativo recusado', (await call(`/price-tables/${TABELA_ID}/items`, { method: 'PUT', token: AT, body: { items: [{ product_id: 20, price: -50 }] } })).status === 404 || (await call(`/admin/price-tables/${TABELA_ID}/items`, { method: 'PUT', token: AT, body: { items: [{ product_id: 20, price: -50 }] } })).status === 400)
check('preço texto recusado', (await call(`/admin/price-tables/${TABELA_ID}/items`, { method: 'PUT', token: AT, body: { items: [{ product_id: 20, price: 'abc' }] } })).status === 400)
check('produto inexistente recusado', (await call(`/admin/price-tables/${TABELA_ID}/items`, { method: 'PUT', token: AT, body: { items: [{ product_id: 99999, price: 10 }] } })).status === 400)

console.log('\n— update parcial (limpar campo)')
await call('/admin/products/1', { method: 'PUT', token: AT, body: { short_use: 'texto qualquer' } })
await call('/admin/products/1', { method: 'PUT', token: AT, body: { short_use: null } })
const p1 = (await call('/admin/products/1', { token: AT })).data.product
check('campo limpo fica vazio mesmo', p1.short_use === null, p1.short_use)
check('outros campos não foram apagados', !!p1.name && !!p1.sku)

console.log('\n— tabela de preço inativa')
await call(`/admin/price-tables/${TABELA_ID}`, { method: 'PUT', token: AT, body: { is_active: false } })
check('catálogo bloqueia tabela inativa', (await call('/catalog', { token: CT })).data.products.length === 0)
check('pedido em tabela inativa recusado', (await call('/orders', { method: 'POST', token: CT, body: item(20) })).status === 400)
await call(`/admin/price-tables/${TABELA_ID}`, { method: 'PUT', token: AT, body: { is_active: true } })
check('reativando, catálogo volta', (await call('/catalog', { token: CT })).data.products.length === PRODUTOS_NA_TABELA)

console.log('\n— senha e sessão')
/* O `iat` do JWT só tem precisão de segundo e a regra dá 1s de folga (pro token emitido no
   mesmo segundo da troca, que é o login novo). Como a suíte roda em milissegundos, espera
   passar essa folga ANTES de resetar — senão o token de teste nasce dentro da janela. */
await new Promise(r => setTimeout(r, 1300))
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

console.log('\n— link público (catálogo aberto)')
/* Documentos gerados a cada rodada (com dígito verificador certo), pra a suíte não
   esbarrar no cliente criado na execução anterior. */
function cnpjValido() {
  const base = Array.from({ length: 12 }, (_, i) => i === 11 ? 1 : Math.floor(Math.random() * 10))
  const dv = (nums) => {
    let sum = 0, pos = nums.length - 7
    for (let i = 0; i < nums.length; i++) { sum += nums[i] * pos--; if (pos < 2) pos = 9 }
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  const d1 = dv(base)
  const d2 = dv([...base, d1])
  return [...base, d1, d2].join('')
}
function cpfValido() {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  const dv = (nums) => {
    let sum = 0
    for (let i = 0; i < nums.length; i++) sum += nums[i] * (nums.length + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  const d1 = dv(base)
  const d2 = dv([...base, d1])
  return [...base, d1, d2].join('')
}
const CNPJ_NOVO = cnpjValido()
const CNPJ_CLIENTE = cnpjValido()   // vai ser colado no cliente que TEM login
const CPF_NOVO = cpfValido()
const EMAIL_LINK = `ze+${CNPJ_NOVO.slice(0, 6)}@mercado.local`

const gerado = await call(`/admin/price-tables/${TABELA_ID}/public-link`, { method: 'POST', token: AT })
const TOKEN = gerado.data?.token
check('gera link público', typeof TOKEN === 'string' && TOKEN.length >= 20, gerado.data)
check('devolve a URL pronta', (gerado.data?.url || '').includes(`/c/${TOKEN}`))

const pub = await call(`/public/catalog/${TOKEN}`)
check('catálogo abre SEM login', pub.status === 200 && Array.isArray(pub.data?.products))
check('catálogo público tem os mesmos produtos da tabela', pub.data?.products?.length === PRODUTOS_NA_TABELA, pub.data?.products?.length)
check('mostra o pedido mínimo da tabela', typeof pub.data?.table?.minimum_order_value === 'number')
check('não vaza id nem apelido da tabela', !/"(id|slug|price_table_id)"/.test(JSON.stringify(pub.data?.table || {})))
check('traz os prazos com as formas de pagamento', pub.data?.payment_terms?.every(t => Array.isArray(t.methods)))

const inexistente = await call('/public/catalog/tokeninventado123456')
check('token inventado dá 404', inexistente.status === 404)
await call(`/admin/price-tables/${TABELA_ID}/public-link`, { method: 'PATCH', token: AT, body: { enabled: false } })
const pausado = await call(`/public/catalog/${TOKEN}`)
check('link pausado dá 404', pausado.status === 404)
check('404 de pausado é IGUAL ao de token errado (anti-adivinhação)', pausado.data?.error === inexistente.data?.error)
await call(`/admin/price-tables/${TABELA_ID}/public-link`, { method: 'PATCH', token: AT, body: { enabled: true } })
check('retomando, o catálogo volta', (await call(`/public/catalog/${TOKEN}`)).status === 200)

/* ── Pedido pelo link ── */
const dados = (doc) => ({
  name: 'Mercado do Ze', company_name: 'Mercado do Ze Ltda', document: doc,
  whatsapp: '14998887766', email: EMAIL_LINK,
  address: 'Rua das Flores, 100 - Centro', city: 'Bauru', state: 'SP', zip_code: '17000-000',
})
const pedidoPub = (doc, extra = {}) => call(`/public/orders/${TOKEN}`, {
  method: 'POST',
  body: {
    items: [{ product_id: 20, quantity: 20 }],
    customer: dados(doc),
    payment_term: 'Boleto 28 dias', payment_method: 'boleto',
    elapsed_ms: 30000,
    ...extra,
  },
})

check('abaixo do mínimo é recusado no link', (await pedidoPub(CNPJ_NOVO, { items: [{ product_id: 20, quantity: 1 }] })).data?.code === 'MIN_ORDER_NOT_MET')
check('prazo a prazo + PIX é recusado no link', (await pedidoPub(CNPJ_NOVO, { payment_method: 'pix' })).data?.code === 'PAYMENT_METHOD_NOT_ALLOWED')
check('quantidade quebrada é recusada no link', (await pedidoPub(CNPJ_NOVO, { items: [{ product_id: 20, quantity: 2.5 }] })).status === 400)
check('CNPJ inválido é recusado', (await pedidoPub('11222333000100')).data?.code === 'INVALID_DOCUMENT')
check('CPF inválido é recusado', (await pedidoPub('11111111111')).data?.code === 'INVALID_DOCUMENT')
check('sem endereço de entrega é recusado', (await pedidoPub(CNPJ_NOVO, { customer: { ...dados(CNPJ_NOVO), address: '' } })).status === 400)
check('formulário preenchido rápido demais é barrado', (await pedidoPub(CNPJ_NOVO, { elapsed_ms: 500 })).status === 429)

const antesClientes = (await call('/admin/customers', { token: AT })).data.customers.length
const pedidoLink = await pedidoPub(CNPJ_NOVO)
check('pedido pelo link é aceito', pedidoLink.status === 201, pedidoLink.data)
check('devolve o número do pedido', (pedidoLink.data?.order_number || '').startsWith('PED-'))
check('NÃO devolve o id do pedido', pedidoLink.data?.id === undefined)

/* Preço mandado pelo navegador não pode valer */
const comPrecoFalso = await call(`/public/orders/${TOKEN}`, {
  method: 'POST',
  body: {
    items: [{ product_id: 20, quantity: 20, price: 0.01 }],
    customer: dados(CNPJ_NOVO), payment_term: 'Boleto 28 dias', payment_method: 'boleto', elapsed_ms: 30000,
  },
})
check('preço mandado pelo navegador é ignorado', comPrecoFalso.data?.total_value === pedidoLink.data?.total_value, comPrecoFalso.data?.total_value)

const pedidosLink = (await call('/admin/orders?source=public_link', { token: AT })).data.orders
const oLink = pedidosLink.find(o => o.order_number === pedidoLink.data.order_number)
check('pedido aparece no admin marcado como link', !!oLink)
check('guarda o endereço de entrega no pedido', (oLink?.delivery_address || '').includes('Rua das Flores'), oLink?.delivery_address)
check('guarda a tabela do link no pedido', oLink?.price_table_id === TABELA_ID)

const clientesLink = (await call('/admin/customers?origin=link', { token: AT })).data.customers
const clienteDoLink = clientesLink.find(c => c.document_digits === CNPJ_NOVO)
check('criou cliente sem login', !!clienteDoLink && !clienteDoLink.user_id, clienteDoLink && { user_id: clienteDoLink.user_id })
check('cliente marcado como vindo do link', clienteDoLink?.origin === 'link')
check('dois pedidos do mesmo CNPJ não duplicam cliente', (await call('/admin/customers', { token: AT })).data.customers.length === antesClientes + 1)

/* CNPJ de cliente que JÁ tem login: aceita com o preço do link e não mexe no cadastro dele */
await call('/admin/customers/1', { method: 'PUT', token: AT, body: { document: CNPJ_CLIENTE } })
const antes1 = (await call('/admin/customers/1', { token: AT })).data.customer
const doCliente = await pedidoPub(CNPJ_CLIENTE)
check('CNPJ de cliente com login é aceito pelo link', doCliente.status === 201, doCliente.data)
const depois1 = (await call('/admin/customers/1', { token: AT })).data.customer
check('cadastro de quem tem login NÃO é alterado pelo link',
  depois1.user_id === antes1.user_id && depois1.name === antes1.name && depois1.price_table_id === antes1.price_table_id)

/* Criar acesso depois, pra quem veio do link */
const acesso = await call(`/admin/customers/${clienteDoLink.id}/grant-access`, { method: 'POST', token: AT, body: { email: EMAIL_LINK } })
check('cria acesso pra quem veio do link', acesso.status === 201 && (acesso.data?.temp_password || '').length >= 10, acesso.data)
check('login do novo acesso funciona', (await call('/auth/login', { method: 'POST', body: { email: EMAIL_LINK, password: acesso.data.temp_password } })).status === 200)
check('criar acesso duas vezes é bloqueado', (await call(`/admin/customers/${clienteDoLink.id}/grant-access`, { method: 'POST', token: AT, body: { email: `outro+${CNPJ_NOVO.slice(0, 6)}@mercado.local` } })).status === 409)

/* Consulta de CNPJ pelo link exige token */
check('consulta de CNPJ sem token válido dá 404', (await call(`/public/cnpj/tokeninventado123456/${CNPJ_CLIENTE}`)).status === 404)
check('consulta de CNPJ inválido dá 400', (await call(`/public/cnpj/${TOKEN}/11111111111111`)).status === 400)

/* Revogar mata o link na hora */
await call(`/admin/price-tables/${TABELA_ID}/public-link`, { method: 'DELETE', token: AT })
check('revogar derruba o link', (await call(`/public/catalog/${TOKEN}`)).status === 404)
check('pedido pelo link revogado é recusado', (await pedidoPub(CPF_NOVO)).status === 404)

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
