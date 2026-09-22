import { Router } from 'express'
import db from '../../db.js'

const router = Router()

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM payment_terms ORDER BY position, id').all()
  res.json({ payment_terms: rows })
})

router.post('/', (req, res) => {
  const { label, days, position } = req.body
  if (!label || !days) return res.status(400).json({ error: 'label e days obrigatórios' })
  const r = db.prepare('INSERT INTO payment_terms (label, days, position) VALUES (?, ?, ?)')
              .run(label, String(days), position || 0)
  res.status(201).json({ id: r.lastInsertRowid })
})

router.put('/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM payment_terms WHERE id = ?').get(req.params.id)
  if (!cur) return res.status(404).json({ error: 'Não encontrado' })
  const b = req.body
  db.prepare(`
    UPDATE payment_terms SET
      label = COALESCE(?, label),
      days = COALESCE(?, days),
      position = COALESCE(?, position),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(b.label ?? null, b.days ?? null, b.position ?? null,
         b.is_active === undefined ? null : (b.is_active ? 1 : 0), req.params.id)
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM payment_terms WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
