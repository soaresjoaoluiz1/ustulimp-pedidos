import { Router } from 'express'
import db from '../db.js'
import { requireAuth, requireCustomer } from '../middleware/auth.js'

const router = Router()

function parseTags(row) {
  if (!row) return row
  try { row.tags = row.tags ? JSON.parse(row.tags) : [] } catch { row.tags = [] }
  return row
}

/* GET /api/catalog — produtos da tabela do cliente logado.
   Apenas produtos COM linha em price_table_items (com is_active=1) aparecem.
   Suporta filtros: ?category_id= &search= */
router.get('/', requireAuth, requireCustomer, (req, res) => {
  const { category_id, search } = req.query
  if (!req.customer.price_table_id) {
    return res.status(400).json({ error: 'Cliente sem tabela de preço vinculada. Contate o admin.' })
  }

  const where = ['p.is_active = 1', 'pti.is_active = 1', 'pt.is_active = 1', 'pti.price_table_id = ?']
  const params = [req.customer.price_table_id]
  if (category_id) { where.push('p.category_id = ?'); params.push(category_id) }
  if (search) {
    where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.short_use LIKE ?)')
    const q = `%${search}%`
    params.push(q, q, q)
  }

  const rows = db.prepare(`
    SELECT
      p.id, p.sku, p.name, p.short_use, p.description, p.unit, p.image_url,
      p.market_price, p.suggested_sale_price, p.units_per_box, p.peso_kg, p.volume_m3, p.tags, p.featured,
      pti.price,
      c.id AS category_id, c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon
    FROM products p
    JOIN price_table_items pti ON pti.product_id = p.id
    JOIN price_tables pt ON pt.id = pti.price_table_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE ${where.join(' AND ')}
    ORDER BY c.position, p.name
  `).all(...params).map(parseTags)

  res.json({ products: rows, total: rows.length })
})

/* GET /api/catalog/categories — categorias com contagem de produtos da tabela do cliente */
router.get('/categories', requireAuth, requireCustomer, (req, res) => {
  const tableId = req.customer.price_table_id
  const rows = db.prepare(`
    SELECT c.*,
           (SELECT COUNT(*) FROM products p
            JOIN price_table_items pti ON pti.product_id = p.id
            WHERE p.category_id = c.id AND p.is_active = 1
              AND pti.price_table_id = ? AND pti.is_active = 1) AS product_count
    FROM categories c
    WHERE c.is_active = 1
    ORDER BY c.position, c.name
  `).all(tableId)
  res.json({ categories: rows })
})

/* GET /api/catalog/banners — banners ativos pra slider promocional */
router.get('/banners', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT * FROM banners WHERE is_active = 1 ORDER BY position, id`).all()
  res.json({ banners: rows })
})

export default router
