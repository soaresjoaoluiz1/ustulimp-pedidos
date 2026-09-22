import { Router } from 'express'
import db from '../../db.js'

const router = Router()

const VALID_STATUS = ['novo','em_analise','confirmado','separado','entregue','cancelado']

const STATUS_LABEL = {
  novo: 'Novo', em_analise: 'Em análise', confirmado: 'Confirmado',
  separado: 'Separado', entregue: 'Entregue', cancelado: 'Cancelado'
}

function csvEscape(v) {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

/* GET /api/admin/orders/export.csv?status=&from=&to=&include_items=1 */
function exportCsv(req, res) {
  const { status, from, to, include_items } = req.query
  const where = []
  const params = []
  if (status) { where.push('o.status = ?'); params.push(status) }
  if (from) { where.push('o.created_at >= ?'); params.push(from) }
  if (to) { where.push('o.created_at <= ?'); params.push(to) }

  const orders = db.prepare(`
    SELECT
      o.id, o.order_number, o.created_at, o.status,
      o.subtotal, o.total_value, o.payment_term, o.payment_method, o.notes,
      o.peso_total_kg, o.volume_total_m3, o.items_count,
      c.name AS customer_name, c.company_name, c.document, c.document_type,
      c.phone, c.whatsapp, c.city, c.state, c.address,
      pt.name AS price_table_name
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN price_tables pt ON pt.id = o.price_table_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY o.created_at DESC
  `).all(...params)

  let itemsByOrder = {}
  if (include_items === '1') {
    const allItems = db.prepare(`
      SELECT order_id, product_sku_snapshot, product_name_snapshot, quantity, unit_price_snapshot, subtotal
      FROM order_items
    `).all()
    for (const it of allItems) {
      if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = []
      itemsByOrder[it.order_id].push(`${it.quantity}x ${it.product_name_snapshot} (${it.product_sku_snapshot || '—'}) @ ${it.unit_price_snapshot}`)
    }
  }

  const headers = [
    'numero', 'data', 'status',
    'cliente', 'empresa', 'documento', 'tipo_doc',
    'telefone', 'whatsapp', 'cidade', 'estado', 'endereco',
    'tabela_preco', 'prazo_pagamento', 'forma_pagamento',
    'qtd_itens', 'peso_kg', 'volume_m3',
    'subtotal', 'total',
    'observacoes_cliente'
  ]
  if (include_items === '1') headers.push('itens')

  const lines = [headers.join(';')]
  for (const o of orders) {
    const row = [
      o.order_number,
      o.created_at,
      STATUS_LABEL[o.status] || o.status,
      o.customer_name,
      o.company_name,
      o.document,
      o.document_type,
      o.phone,
      o.whatsapp,
      o.city,
      o.state,
      o.address,
      o.price_table_name,
      o.payment_term,
      o.payment_method,
      o.items_count,
      (o.peso_total_kg || 0).toFixed(2).replace('.', ','),
      (o.volume_total_m3 || 0).toFixed(4).replace('.', ','),
      (o.subtotal || 0).toFixed(2).replace('.', ','),
      (o.total_value || 0).toFixed(2).replace('.', ','),
      o.notes
    ]
    if (include_items === '1') row.push((itemsByOrder[o.id] || []).join(' | '))
    lines.push(row.map(csvEscape).join(';'))
  }

  const today = new Date().toISOString().slice(0, 10)
  const filename = `pedidos-oxi-${today}.csv`

  /* BOM UTF-8 pra Excel reconhecer acentos */
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send('﻿' + lines.join('\n'))
}

/* GET /api/admin/orders/export.csv — DEVE vir antes do GET /:id */
router.get('/export.csv', exportCsv)

/* GET /api/admin/orders?status=&customer_id=&search=&from=&to= */
router.get('/', (req, res) => {
  const { status, customer_id, search, from, to } = req.query
  const where = []
  const params = []
  if (status) { where.push('o.status = ?'); params.push(status) }
  if (customer_id) { where.push('o.customer_id = ?'); params.push(customer_id) }
  if (from) { where.push('o.created_at >= ?'); params.push(from) }
  if (to) { where.push('o.created_at <= ?'); params.push(to) }
  if (search) {
    where.push('(o.order_number LIKE ? OR c.name LIKE ? OR c.company_name LIKE ?)')
    const q = `%${search}%`
    params.push(q, q, q)
  }

  const rows = db.prepare(`
    SELECT
      o.*,
      c.name AS customer_name, c.company_name, c.city, c.state,
      pt.name AS price_table_name
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN price_tables pt ON pt.id = o.price_table_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY o.created_at DESC
    LIMIT 500
  `).all(...params)

  res.json({ orders: rows })
})

/* GET /api/admin/orders/:id — full detail */
router.get('/:id', (req, res) => {
  const order = db.prepare(`
    SELECT o.*, c.name AS customer_name, c.company_name, c.phone, c.whatsapp,
           c.city, c.state, c.address, c.document, c.document_type,
           pt.name AS price_table_name
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN price_tables pt ON pt.id = o.price_table_id
    WHERE o.id = ?
  `).get(req.params.id)
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' })

  const items = db.prepare(`
    SELECT * FROM order_items WHERE order_id = ? ORDER BY id
  `).all(order.id)

  const history = db.prepare(`
    SELECT h.*, u.name AS changed_by_name
    FROM order_status_history h
    LEFT JOIN users u ON u.id = h.changed_by
    WHERE h.order_id = ?
    ORDER BY h.created_at DESC
  `).all(order.id)

  res.json({ order, items, history })
})

/* PATCH /api/admin/orders/:id/status */
router.patch('/:id/status', (req, res) => {
  const { status, notes } = req.body
  if (!VALID_STATUS.includes(status)) return res.status(400).json({ error: 'Status inválido' })

  const cur = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
  if (!cur) return res.status(404).json({ error: 'Pedido não encontrado' })
  if (cur.status === status) return res.json({ ok: true, unchanged: true })

  const tx = db.transaction(() => {
    db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, cur.id)
    db.prepare(`
      INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(cur.id, cur.status, status, req.user.id, notes || null)
  })
  tx()

  res.json({ ok: true, from: cur.status, to: status })
})

/* PUT /api/admin/orders/:id/admin-notes */
router.put('/:id/admin-notes', (req, res) => {
  const { admin_notes } = req.body
  db.prepare(`UPDATE orders SET admin_notes = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(admin_notes || null, req.params.id)
  res.json({ ok: true })
})

export default router
