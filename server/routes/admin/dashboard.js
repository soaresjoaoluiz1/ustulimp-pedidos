import { Router } from 'express'
import db from '../../db.js'

const router = Router()

router.get('/', (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const last30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const totals = {
    total_orders:        db.prepare('SELECT COUNT(*) as n FROM orders').get().n,
    total_revenue:       db.prepare("SELECT COALESCE(SUM(total_value),0) as s FROM orders WHERE status NOT IN ('cancelado')").get().s,
    pending_orders:      db.prepare("SELECT COUNT(*) as n FROM orders WHERE status IN ('novo','em_analise')").get().n,
    total_customers:     db.prepare('SELECT COUNT(*) as n FROM customers WHERE is_active = 1').get().n,
    total_products:      db.prepare('SELECT COUNT(*) as n FROM products WHERE is_active = 1').get().n,
    orders_today:        db.prepare(`SELECT COUNT(*) as n FROM orders WHERE date(created_at) = ?`).get(today).n,
    orders_30d:          db.prepare(`SELECT COUNT(*) as n FROM orders WHERE date(created_at) >= ?`).get(last30).n,
    revenue_30d:         db.prepare(`SELECT COALESCE(SUM(total_value),0) as s FROM orders WHERE date(created_at) >= ? AND status NOT IN ('cancelado')`).get(last30).s
  }

  const by_status = db.prepare(`
    SELECT status, COUNT(*) as count, COALESCE(SUM(total_value),0) as total
    FROM orders GROUP BY status
  `).all()

  const top_products = db.prepare(`
    SELECT
      oi.product_id, oi.product_name_snapshot AS name,
      SUM(oi.quantity) AS qty, SUM(oi.subtotal) AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status NOT IN ('cancelado')
    GROUP BY oi.product_id
    ORDER BY revenue DESC
    LIMIT 10
  `).all()

  const top_customers = db.prepare(`
    SELECT
      c.id, c.name, c.company_name, c.city, c.state,
      COUNT(o.id) AS orders_count, COALESCE(SUM(o.total_value),0) AS total_spent
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id AND o.status NOT IN ('cancelado')
    GROUP BY c.id
    HAVING orders_count > 0
    ORDER BY total_spent DESC
    LIMIT 10
  `).all()

  const recent_orders = db.prepare(`
    SELECT o.id, o.order_number, o.status, o.total_value, o.items_count, o.created_at,
           c.name AS customer_name, c.company_name
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    ORDER BY o.created_at DESC
    LIMIT 10
  `).all()

  res.json({ totals, by_status, top_products, top_customers, recent_orders })
})

export default router
