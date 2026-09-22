import { Router } from 'express'
import db from '../../db.js'

const router = Router()

function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
    FROM categories c
    ORDER BY c.position, c.name
  `).all()
  res.json({ categories: rows })
})

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Categoria não encontrada' })
  res.json({ category: row })
})

router.post('/', (req, res) => {
  const { name, icon, description, position } = req.body
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' })
  const slug = slugify(name)
  try {
    const r = db.prepare(`
      INSERT INTO categories (name, slug, icon, description, position)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, slug, icon || null, description || null, position || 0)
    res.status(201).json({ id: r.lastInsertRowid, slug })
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Já existe categoria com esse nome' })
    throw err
  }
})

router.put('/:id', (req, res) => {
  const { name, icon, description, position, is_active } = req.body
  const cur = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id)
  if (!cur) return res.status(404).json({ error: 'Categoria não encontrada' })
  const newSlug = name ? slugify(name) : cur.slug
  db.prepare(`
    UPDATE categories SET
      name = COALESCE(?, name),
      slug = ?,
      icon = COALESCE(?, icon),
      description = COALESCE(?, description),
      position = COALESCE(?, position),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(name ?? null, newSlug, icon ?? null, description ?? null, position ?? null,
         is_active === undefined ? null : (is_active ? 1 : 0), req.params.id)
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  const used = db.prepare('SELECT COUNT(*) as n FROM products WHERE category_id = ?').get(req.params.id).n
  if (used > 0) return res.status(409).json({ error: `Existem ${used} produtos nessa categoria. Reatribua antes de deletar.` })
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
