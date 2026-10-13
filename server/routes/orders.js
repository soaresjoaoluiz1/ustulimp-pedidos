/**
 * Pedidos do cliente logado. A regra de criação (preço, mínimo, pagamento, snapshot) fica em
 * `server/lib/order-create.js`, compartilhada com o link público.
 */
import { Router } from 'express'
import db from '../db.js'
import { requireAuth, requireCustomer } from '../middleware/auth.js'
import { allowedTermsForCustomer, methodsForTerm } from '../lib/payments.js'
import {
  OrderError, requireActiveTable, resolvePayment, priceOrderItems,
  effectiveMinimum, assertMinimum, createOrder, sendOrderEmailsInBackground,
} from '../lib/order-create.js'

const router = Router()

/* GET /api/orders — pedidos do próprio cliente */
router.get('/', requireAuth, requireCustomer, (req, res) => {
  const rows = db.prepare(`
    SELECT id, order_number, status, total_value, items_count,
           payment_term, payment_method, source, created_at
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
    SELECT o.*, pt.name AS price_table_name,
           c.name AS customer_name, c.company_name, c.document, c.document_type,
           c.phone, c.whatsapp, c.city, c.state, c.address, c.zip_code
    FROM orders o
    LEFT JOIN price_tables pt ON pt.id = o.price_table_id
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ? AND o.customer_id = ?
  `).get(req.params.id, req.customer.id)
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' })

  const items = db.prepare(`
    SELECT * FROM order_items WHERE order_id = ? ORDER BY id
  `).all(order.id)

  res.json({ order, items })
})

/* POST /api/orders
   body: { items: [{ product_id, quantity }], payment_term, payment_method, notes } */
router.post('/', requireAuth, requireCustomer, (req, res, next) => {
  const { items, payment_term, payment_method, notes } = req.body
  try {
    if (!req.customer.price_table_id) {
      return res.status(400).json({ error: 'Cliente sem tabela de preço vinculada' })
    }
    const table = requireActiveTable(req.customer.price_table_id, {
      message: 'Sua tabela de preço está inativa. Fale com o comercial.'
    })
    const { term } = resolvePayment({ customer: req.customer, payment_term, payment_method })
    const priced = priceOrderItems({ priceTableId: table.id, items })
    assertMinimum({ minimum: effectiveMinimum({ customer: req.customer, table }), subtotal: priced.subtotal })

    const { orderId, orderNumber } = createOrder({
      customerId: req.customer.id,
      priceTableId: table.id,
      priced, term, payment_method, notes,
      /* Entrega: usa o endereço do cadastro do cliente */
      delivery: {
        address: req.customer.address,
        city: req.customer.city,
        state: req.customer.state,
        zip_code: req.customer.zip_code,
      },
      source: 'portal',
      changedByUserId: req.user.id,
      historyNote: 'Pedido criado pelo cliente',
    })

    sendOrderEmailsInBackground({ orderId, customer: req.customer, userEmail: req.user.email })

    res.status(201).json({
      id: orderId,
      order_number: orderNumber,
      total_value: priced.subtotal,
      items_count: priced.items.length,
      boxes_count: priced.boxes,
      peso_total_kg: priced.peso,
      volume_total_m3: priced.volume,
      message: 'Pedido enviado com sucesso. Um consultor entrará em contato.'
    })
  } catch (err) {
    if (err instanceof OrderError) return res.status(err.status).json({ error: err.message, ...err.extra })
    next(err)
  }
})

/* GET /api/orders/_/payment-terms — prazos liberados pro cliente, com as formas de pagamento */
router.get('/_/payment-terms', requireAuth, requireCustomer, (req, res) => {
  const rows = allowedTermsForCustomer(req.customer).map(t => ({ ...t, methods: methodsForTerm(t.days) }))
  res.json({ payment_terms: rows })
})

export default router
