import { Router } from 'express'
import db from '../../db.js'

const router = Router()

function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/* GET /api/admin/price-tables — lista todas */
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT pt.*,
           (SELECT COUNT(*) FROM price_table_items pti WHERE pti.price_table_id = pt.id AND pti.is_active = 1) AS items_count,
           (SELECT COUNT(*) FROM customers c WHERE c.price_table_id = pt.id AND c.is_active = 1) AS customers_count
    FROM price_tables pt
    ORDER BY pt.id
  `).all()
  res.json({ price_tables: rows })
})

/* GET /api/admin/price-tables/:id/items — lista TODOS produtos com flag se tem preço nessa tabela */
router.get('/:id/items', (req, res) => {
  const table = db.prepare('SELECT * FROM price_tables WHERE id = ?').get(req.params.id)
  if (!table) return res.status(404).json({ error: 'Tabela não encontrada' })

  const items = db.prepare(`
    SELECT
      p.id AS product_id,
      p.sku, p.name, p.unit, p.market_price, p.is_active AS product_active,
      c.name AS category_name, c.id AS category_id,
      pti.id AS pti_id,
      pti.price,
      COALESCE(pti.is_active, 0) AS is_active
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN price_table_items pti ON pti.product_id = p.id AND pti.price_table_id = ?
    ORDER BY c.position, p.name
  `).all(req.params.id)

  res.json({ price_table: table, items })
})

/* PUT /api/admin/price-tables/:id/items — bulk update (UPSERT)
   body: { items: [{ product_id, price, is_active }] }
*/
router.put('/:id/items', (req, res) => {
  const tableId = parseInt(req.params.id, 10)
  const table = db.prepare('SELECT * FROM price_tables WHERE id = ?').get(tableId)
  if (!table) return res.status(404).json({ error: 'Tabela não encontrada' })

  const items = Array.isArray(req.body.items) ? req.body.items : []
  if (!items.length) return res.status(400).json({ error: 'items[] obrigatório' })

  const upsert = db.prepare(`
    INSERT INTO price_table_items (price_table_id, product_id, price, is_active)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(price_table_id, product_id) DO UPDATE SET
      price = excluded.price,
      is_active = excluded.is_active
  `)
  const remove = db.prepare('DELETE FROM price_table_items WHERE price_table_id = ? AND product_id = ?')

  let updated = 0, removed = 0
  const tx = db.transaction(() => {
    for (const it of items) {
      if (it.remove) {
        remove.run(tableId, it.product_id)
        removed++
      } else {
        upsert.run(tableId, it.product_id, it.price, it.is_active === false ? 0 : 1)
        updated++
      }
    }
  })
  tx()
  res.json({ ok: true, updated, removed })
})

router.post('/', (req, res) => {
  const { name, description, distance_min_km, distance_max_km, minimum_order_value } = req.body
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' })
  const slug = slugify(name)
  try {
    const r = db.prepare(`
      INSERT INTO price_tables (name, slug, description, distance_min_km, distance_max_km, minimum_order_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, slug, description || null, distance_min_km ?? null, distance_max_km ?? null, minimum_order_value || 0)
    res.status(201).json({ id: r.lastInsertRowid, slug })
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Já existe tabela com esse nome' })
    throw err
  }
})

router.put('/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM price_tables WHERE id = ?').get(req.params.id)
  if (!cur) return res.status(404).json({ error: 'Tabela não encontrada' })
  const b = req.body
  const newSlug = b.name ? slugify(b.name) : cur.slug
  db.prepare(`
    UPDATE price_tables SET
      name = COALESCE(?, name),
      slug = ?,
      description = COALESCE(?, description),
      distance_min_km = COALESCE(?, distance_min_km),
      distance_max_km = COALESCE(?, distance_max_km),
      minimum_order_value = COALESCE(?, minimum_order_value),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(b.name ?? null, newSlug, b.description ?? null,
         b.distance_min_km ?? null, b.distance_max_km ?? null,
         b.minimum_order_value ?? null,
         b.is_active === undefined ? null : (b.is_active ? 1 : 0),
         req.params.id)
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  const customers = db.prepare('SELECT COUNT(*) as n FROM customers WHERE price_table_id = ?').get(req.params.id).n
  if (customers > 0) return res.status(409).json({ error: `${customers} clientes vinculados a essa tabela. Desvincule antes de deletar.` })
  db.prepare('DELETE FROM price_tables WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
