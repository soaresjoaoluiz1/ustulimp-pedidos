/**
 * Criação de pedido — a regra de negócio inteira num lugar só.
 *
 * Duas portas de entrada usam isto: o checkout do cliente logado (`routes/orders.js`) e o
 * checkout do link público (`routes/public.js`). O preço SEMPRE sai daqui, lido da tabela
 * no banco; nada que venha do navegador vira dinheiro.
 *
 * O que fica garantido pelos dois caminhos: tabela ativa, prazo liberado, forma de pagamento
 * combinando com o prazo, quantidade em caixas inteiras, pedido mínimo, snapshot de preço e
 * de peso no item, histórico e e-mails.
 */
import db from '../db.js'
import { sendMail } from './mailer.js'
import { adminNewOrderTemplate, customerOrderConfirmedTemplate } from './email-templates.js'
import { allowedTermsForCustomer, methodsForTerm, PAYMENT_METHODS } from './payments.js'

/** Erro com o mesmo formato que o front já trata (code + campos extras). */
export class OrderError extends Error {
  constructor(message, extra = {}, status = 400) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

export function generateOrderNumber() {
  const year = new Date().getFullYear()
  const last = db.prepare(`
    SELECT order_number FROM orders
    WHERE order_number LIKE ?
    ORDER BY id DESC LIMIT 1
  `).get(`PED-${year}-%`)
  let next = 1
  if (last) {
    const m = last.order_number.match(/-(\d+)$/)
    if (m) next = parseInt(m[1], 10) + 1
  }
  return `PED-${year}-${String(next).padStart(5, '0')}`
}

/** Tabela ativa ou erro pronto pra devolver. */
export function requireActiveTable(priceTableId, { message } = {}) {
  const table = priceTableId ? db.prepare('SELECT * FROM price_tables WHERE id = ?').get(priceTableId) : null
  if (!table || !table.is_active) {
    throw new OrderError(message || 'Tabela de preço indisponível. Fale com o comercial.')
  }
  return table
}

/** Prazo + forma de pagamento. `customer` pode ser null (link público = todos os prazos ativos). */
export function resolvePayment({ customer, payment_term, payment_method }) {
  const term = allowedTermsForCustomer(customer).find(t => t.label === payment_term)
  if (!term) {
    throw new OrderError('Prazo de pagamento inválido ou não liberado pra sua conta')
  }
  const methods = methodsForTerm(term.days)
  if (!payment_method || !methods.includes(payment_method)) {
    throw new OrderError(
      `Pra "${term.label}" a forma de pagamento precisa ser ${methods.map(m => PAYMENT_METHODS[m]).join(' ou ')}.`,
      { code: 'PAYMENT_METHOD_NOT_ALLOWED', allowed_methods: methods }
    )
  }
  return { term, methods }
}

/** Lê o preço de cada item NA TABELA e devolve os itens com snapshot + totais. */
export function priceOrderItems({ priceTableId, items }) {
  if (!Array.isArray(items) || items.length === 0) throw new OrderError('Pedido vazio')
  if (items.length > 60) throw new OrderError('Pedido com itens demais. Divida em dois pedidos.')

  const stmt = db.prepare(`
    SELECT
      p.id AS product_id, p.sku, p.name, p.unit,
      p.peso_kg, p.volume_m3, p.is_active AS product_active,
      pti.price, pti.is_active AS pti_active
    FROM products p
    LEFT JOIN price_table_items pti ON pti.product_id = p.id AND pti.price_table_id = ?
    WHERE p.id = ?
  `)

  const validatedItems = []
  let subtotal = 0, peso = 0, volume = 0, boxes = 0

  for (const it of items) {
    const qty = Number(it.quantity)
    if (!it.product_id || !Number.isInteger(qty) || qty <= 0 || qty > 999) {
      throw new OrderError(`Quantidade inválida no item ${it.product_id}: use um número inteiro de caixas entre 1 e 999.`)
    }
    const row = stmt.get(priceTableId, it.product_id)
    if (!row || !row.product_active) {
      throw new OrderError(
        `O produto "${row?.name || it.product_id}" saiu do catálogo. Remova do carrinho pra continuar.`,
        { code: 'ITEM_UNAVAILABLE', product_ids: [it.product_id] }
      )
    }
    if (!row.price || row.price <= 0 || !row.pti_active) {
      throw new OrderError(
        `O produto "${row.name}" não está disponível nesta tabela de preço. Remova do carrinho pra continuar.`,
        { code: 'ITEM_UNAVAILABLE', product_ids: [it.product_id] }
      )
    }

    const itemSubtotal = +(row.price * qty).toFixed(2)
    validatedItems.push({
      product_id: row.product_id,
      product_name_snapshot: row.name,
      product_sku_snapshot: row.sku,
      unit_price_snapshot: row.price,
      quantity: qty,
      subtotal: itemSubtotal,
      peso_kg_snapshot: (row.peso_kg || 0) * qty,
      volume_m3_snapshot: (row.volume_m3 || 0) * qty
    })
    subtotal += itemSubtotal
    peso += (row.peso_kg || 0) * qty
    volume += (row.volume_m3 || 0) * qty
    boxes += qty
  }

  return {
    items: validatedItems,
    subtotal: +subtotal.toFixed(2),
    peso: +peso.toFixed(3),
    volume: +volume.toFixed(4),
    boxes: Math.round(boxes),
  }
}

/** Mínimo que vale: override do cliente tem prioridade; senão o da tabela. */
export function effectiveMinimum({ customer, table }) {
  const override = customer?.minimum_order_value || 0
  return override > 0 ? override : (table?.minimum_order_value || 0)
}

export function assertMinimum({ minimum, subtotal }) {
  if (minimum > 0 && subtotal < minimum) {
    throw new OrderError(
      `Pedido mínimo de R$ ${minimum.toFixed(2).replace('.', ',')}. Subtotal atual: R$ ${subtotal.toFixed(2).replace('.', ',')}.`,
      { code: 'MIN_ORDER_NOT_MET', minimum, subtotal }
    )
  }
}

/**
 * Grava pedido + itens + histórico numa transação só.
 * `beforeInsert` roda DENTRO da transação (o link público usa pra criar/achar o cliente).
 */
export function createOrder({
  customerId, priceTableId, priced, term, payment_method, notes,
  delivery = {}, source = 'portal', publicToken = null, changedByUserId = null, historyNote,
  beforeInsert,
}) {
  let orderId, orderNumber

  db.transaction(() => {
    if (beforeInsert) {
      const resolved = beforeInsert()
      if (resolved?.customerId) customerId = resolved.customerId
      if (resolved?.priceTableId) priceTableId = resolved.priceTableId
    }
    if (!customerId) throw new OrderError('Pedido sem cliente')

    orderNumber = generateOrderNumber()
    const r = db.prepare(`
      INSERT INTO orders (
        order_number, customer_id, price_table_id, status,
        subtotal, total_value, payment_term, payment_method, notes,
        items_count, peso_total_kg, volume_total_m3,
        source, public_token_used,
        delivery_address, delivery_city, delivery_state, delivery_zip_code
      ) VALUES (?, ?, ?, 'novo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderNumber, customerId, priceTableId,
      priced.subtotal, priced.subtotal,
      term.label, payment_method, notes || null,
      priced.items.length, priced.peso, priced.volume,
      source, publicToken,
      delivery.address || null, delivery.city || null, delivery.state || null, delivery.zip_code || null
    )
    orderId = r.lastInsertRowid

    const itemStmt = db.prepare(`
      INSERT INTO order_items (
        order_id, product_id, product_name_snapshot, product_sku_snapshot,
        unit_price_snapshot, quantity, subtotal, peso_kg_snapshot, volume_m3_snapshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const it of priced.items) {
      itemStmt.run(orderId, it.product_id, it.product_name_snapshot, it.product_sku_snapshot,
                   it.unit_price_snapshot, it.quantity, it.subtotal,
                   it.peso_kg_snapshot, it.volume_m3_snapshot)
    }

    db.prepare(`
      INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes)
      VALUES (?, NULL, 'novo', ?, ?)
    `).run(orderId, changedByUserId, historyNote || 'Pedido criado pelo cliente')
  })()

  return { orderId, orderNumber, customerId, priceTableId }
}

/** E-mails de notificação. Falha aqui não derruba o pedido — só vai pro log. */
export async function sendOrderEmails({ orderId, customer, userEmail, viaPublicLink = false }) {
  const order = db.prepare(`
    SELECT o.*, pt.name AS price_table_name
    FROM orders o LEFT JOIN price_tables pt ON pt.id = o.price_table_id
    WHERE o.id = ?
  `).get(orderId)
  if (!order) return
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId)

  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL
  if (adminEmail) {
    const tpl = adminNewOrderTemplate({ order, items, customer, viaPublicLink })
    await sendMail({ to: adminEmail, subject: tpl.subject, html: tpl.html, text: tpl.text })
  }

  if (userEmail) {
    const tpl = customerOrderConfirmedTemplate({ order, items, customer })
    await sendMail({ to: userEmail, subject: tpl.subject, html: tpl.html, text: tpl.text })
  }
}

/** Dispara os e-mails sem segurar a resposta. */
export function sendOrderEmailsInBackground(args) {
  Promise.resolve().then(() => sendOrderEmails(args))
    .catch(err => console.error('[orders] erro nos emails:', err))
}
