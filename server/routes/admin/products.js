import { Router } from 'express'
import db from '../../db.js'

const router = Router()

function parseTags(row) {
  if (!row) return row
  try { row.tags = row.tags ? JSON.parse(row.tags) : [] } catch { row.tags = [] }
  return row
}

/* GET /api/admin/products?category_id=X&search=Y&active=1 */
router.get('/', (req, res) => {
  const { category_id, search, active } = req.query
  const where = []
  const params = []
  if (category_id) { where.push('p.category_id = ?'); params.push(category_id) }
  if (active !== undefined) { where.push('p.is_active = ?'); params.push(active === '1' ? 1 : 0) }
  if (search) {
    where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.short_use LIKE ?)')
    const q = `%${search}%`
    params.push(q, q, q)
  }
  const sql = `
    SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY c.position, p.name
  `
  const rows = db.prepare(sql).all(...params).map(parseTags)
  res.json({ products: rows, total: rows.length })
})

/* GET /api/admin/products/:id — inclui preços em todas as tabelas */
router.get('/:id', (req, res) => {
  const product = parseTags(db.prepare(`
    SELECT p.*, c.name AS category_name FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(req.params.id))
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' })

  const prices = db.prepare(`
    SELECT pt.id AS price_table_id, pt.name AS price_table_name, pt.slug,
           pti.id AS pti_id, pti.price, pti.is_active
    FROM price_tables pt
    LEFT JOIN price_table_items pti ON pti.price_table_id = pt.id AND pti.product_id = ?
    ORDER BY pt.id
  `).all(product.id)

  res.json({ product, prices })
})

/* POST /api/admin/products */
router.post('/', (req, res) => {
  const {
    sku, name, short_use, description, category_id, unit, image_url,
    market_price, suggested_sale_price, units_per_box, peso_kg, volume_m3, tags, featured
  } = req.body
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' })

  try {
    const r = db.prepare(`
      INSERT INTO products (sku, name, short_use, description, category_id, unit, image_url,
                            market_price, suggested_sale_price, units_per_box, peso_kg, volume_m3, tags, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sku || null, name, short_use || null, description || null,
      category_id || null, unit || 'un', image_url || null,
      market_price || null, suggested_sale_price || null, units_per_box || null,
      peso_kg || 0, volume_m3 || 0,
      tags ? JSON.stringify(tags) : null,
      featured ? 1 : 0
    )
    res.status(201).json({ id: r.lastInsertRowid })
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'SKU já existe' })
    throw err
  }
})

/* PUT /api/admin/products/:id */
router.put('/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!cur) return res.status(404).json({ error: 'Produto não encontrado' })

  const b = req.body
  db.prepare(`
    UPDATE products SET
      sku = COALESCE(?, sku),
      name = COALESCE(?, name),
      short_use = COALESCE(?, short_use),
      description = COALESCE(?, description),
      category_id = COALESCE(?, category_id),
      unit = COALESCE(?, unit),
      image_url = COALESCE(?, image_url),
      market_price = COALESCE(?, market_price),
      suggested_sale_price = COALESCE(?, suggested_sale_price),
      units_per_box = COALESCE(?, units_per_box),
      peso_kg = COALESCE(?, peso_kg),
      volume_m3 = COALESCE(?, volume_m3),
      tags = COALESCE(?, tags),
      featured = COALESCE(?, featured),
      is_active = COALESCE(?, is_active),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    b.sku ?? null, b.name ?? null, b.short_use ?? null, b.description ?? null,
    b.category_id ?? null, b.unit ?? null, b.image_url ?? null,
    b.market_price ?? null, b.suggested_sale_price ?? null, b.units_per_box ?? null,
    b.peso_kg ?? null, b.volume_m3 ?? null,
    b.tags !== undefined ? JSON.stringify(b.tags) : null,
    b.featured === undefined ? null : (b.featured ? 1 : 0),
    b.is_active === undefined ? null : (b.is_active ? 1 : 0),
    req.params.id
  )
  res.json({ ok: true })
})

/* DELETE /api/admin/products/:id (soft delete via is_active=0) */
router.delete('/:id', (req, res) => {
  const used = db.prepare('SELECT COUNT(*) as n FROM order_items WHERE product_id = ?').get(req.params.id).n
  if (used > 0) {
    db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(req.params.id)
    return res.json({ ok: true, soft: true, message: 'Produto tem pedidos vinculados — desativado em vez de deletado.' })
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id)
  res.json({ ok: true, soft: false })
})

export default router
