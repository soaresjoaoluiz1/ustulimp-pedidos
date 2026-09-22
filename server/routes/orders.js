import { Router } from 'express'
import db from '../db.js'
import { requireAuth, requireCustomer } from '../middleware/auth.js'
import { sendMail } from '../lib/mailer.js'
import { adminNewOrderTemplate, customerOrderConfirmedTemplate } from '../lib/email-templates.js'

const router = Router()

function generateOrderNumber() {
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

/* GET /api/orders — pedidos do próprio cliente */
router.get('/', requireAuth, requireCustomer, (req, res) => {
  const rows = db.prepare(`
    SELECT id, order_number, status, total_value, items_count,
           payment_term, payment_method, created_at
    FROM orders
    WHERE customer_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(req.customer.id)
  res.json({ orders: rows })
})

/* GET /api/orders/:id — detalhe (só do próprio cliente) */
router.get('/:id', requireAuth, requireCustomer, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, pt.name AS price_table_name
    FROM orders o
    LEFT JOIN price_tables pt ON pt.id = o.price_table_id
    WHERE o.id = ? AND o.customer_id = ?
  `).get(req.params.id, req.customer.id)
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' })

  const items = db.prepare(`
    SELECT * FROM order_items WHERE order_id = ? ORDER BY id
  `).all(order.id)

  res.json({ order, items })
})

/* POST /api/orders
   body: {
     items: [{ product_id, quantity }],
     payment_term: "30 dias",
     payment_method: "boleto",
     notes: "..."
   }
*/
router.post('/', requireAuth, requireCustomer, (req, res) => {
  const { items, payment_term, payment_method, notes } = req.body
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Pedido vazio' })
  }
  if (!req.customer.price_table_id) {
    return res.status(400).json({ error: 'Cliente sem tabela de preço vinculada' })
  }
  const tableId = req.customer.price_table_id

  /* Valida e busca preço de cada item */
  const validatedItems = []
  let subtotal = 0, peso = 0, volume = 0, count = 0

  const stmt = db.prepare(`
    SELECT
      p.id AS product_id, p.sku, p.name, p.unit,
      p.peso_kg, p.volume_m3, p.is_active AS product_active,
      pti.price, pti.is_active AS pti_active
    FROM products p
    LEFT JOIN price_table_items pti ON pti.product_id = p.id AND pti.price_table_id = ?
    WHERE p.id = ?
  `)

  for (const it of items) {
    const qty = parseFloat(it.quantity)
    if (!it.product_id || !qty || qty <= 0) {
      return res.status(400).json({ error: `Item inválido: product_id=${it.product_id}, quantity=${it.quantity}` })
    }
    const row = stmt.get(tableId, it.product_id)
    if (!row || !row.product_active) return res.status(400).json({ error: `Produto ${it.product_id} indisponível` })
    if (!row.price || !row.pti_active) return res.status(400).json({ error: `Produto "${row.name}" não tem preço na sua tabela` })

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
    count += qty
  }

  subtotal = +subtotal.toFixed(2)
  peso = +peso.toFixed(3)
  volume = +volume.toFixed(4)

  /* Valida pedido mínimo:
     1) override do cliente (customer.minimum_order_value > 0) tem prioridade
     2) senão usa minimum_order_value da tabela de preço */
  let minRequired = req.customer.minimum_order_value || 0
  if (!minRequired || minRequired === 0) {
    const tableRow = db.prepare('SELECT minimum_order_value FROM price_tables WHERE id = ?').get(tableId)
    minRequired = tableRow?.minimum_order_value || 0
  }
  if (minRequired > 0 && subtotal < minRequired) {
    return res.status(400).json({
      error: `Pedido mínimo de R$ ${minRequired.toFixed(2).replace('.', ',')}. Subtotal atual: R$ ${subtotal.toFixed(2).replace('.', ',')}.`,
      code: 'MIN_ORDER_NOT_MET',
      minimum: minRequired,
      subtotal
    })
  }

  /* Cria pedido + items + history em transação */
  const orderNumber = generateOrderNumber()
  let orderId

  const tx = db.transaction(() => {
    const r = db.prepare(`
      INSERT INTO orders (
        order_number, customer_id, price_table_id, status,
        subtotal, total_value, payment_term, payment_method, notes,
        items_count, peso_total_kg, volume_total_m3
      ) VALUES (?, ?, ?, 'novo', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderNumber, req.customer.id, tableId,
      subtotal, subtotal,
      payment_term || null, payment_method || null, notes || null,
      Math.round(count), peso, volume
    )
    orderId = r.lastInsertRowid

    const itemStmt = db.prepare(`
      INSERT INTO order_items (
        order_id, product_id, product_name_snapshot, product_sku_snapshot,
        unit_price_snapshot, quantity, subtotal, peso_kg_snapshot, volume_m3_snapshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const it of validatedItems) {
      itemStmt.run(orderId, it.product_id, it.product_name_snapshot, it.product_sku_snapshot,
                   it.unit_price_snapshot, it.quantity, it.subtotal,
                   it.peso_kg_snapshot, it.volume_m3_snapshot)
    }

    db.prepare(`
      INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes)
      VALUES (?, NULL, 'novo', ?, 'Pedido criado pelo cliente')
    `).run(orderId, req.user.id)
  })
  tx()

  /* Envia notificações por email (em background, não bloqueia a resposta) */
  Promise.resolve().then(() => sendOrderEmails({ orderId, customer: req.customer, userEmail: req.user.email }))
    .catch(err => console.error('[orders] erro nos emails:', err))

  res.status(201).json({
    id: orderId,
    order_number: orderNumber,
    total_value: subtotal,
    items_count: validatedItems.length,
    peso_total_kg: peso,
    volume_total_m3: volume,
    message: 'Pedido enviado com sucesso. Um consultor entrará em contato.'
  })
})

/* Envia emails de notificação após criar pedido. Falhas são logadas mas não interrompem o fluxo. */
async function sendOrderEmails({ orderId, customer, userEmail }) {
  const order = db.prepare(`
    SELECT o.*, pt.name AS price_table_name
    FROM orders o LEFT JOIN price_tables pt ON pt.id = o.price_table_id
    WHERE o.id = ?
  `).get(orderId)
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId)
  if (!order) return

  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL
  if (adminEmail) {
    const tpl = adminNewOrderTemplate({ order, items, customer })
    await sendMail({ to: adminEmail, subject: tpl.subject, html: tpl.html, text: tpl.text })
  }

  if (userEmail) {
    const tpl = customerOrderConfirmedTemplate({ order, items, customer })
    await sendMail({ to: userEmail, subject: tpl.subject, html: tpl.html, text: tpl.text })
  }
}

/* GET /api/orders/_/payment-terms — lista pro cliente escolher no checkout.
   Se o customer tem allowed_payment_term_ids definido, filtra por eles.
   Se NULL/vazio, retorna todos (compatibilidade). */
router.get('/_/payment-terms', requireAuth, requireCustomer, (req, res) => {
  let allowedIds = null
  try {
    allowedIds = req.customer.allowed_payment_term_ids
      ? JSON.parse(req.customer.allowed_payment_term_ids)
      : null
  } catch {
    allowedIds = null
  }

  let rows
  if (Array.isArray(allowedIds) && allowedIds.length > 0) {
    const placeholders = allowedIds.map(() => '?').join(',')
    rows = db.prepare(`
      SELECT id, label, days FROM payment_terms
      WHERE is_active = 1 AND id IN (${placeholders})
      ORDER BY position, id
    `).all(...allowedIds)
  } else {
    rows = db.prepare(`
      SELECT id, label, days FROM payment_terms
      WHERE is_active = 1 ORDER BY position, id
    `).all()
  }

  res.json({ payment_terms: rows })
})

export default router
