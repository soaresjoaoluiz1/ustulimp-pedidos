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
  const id = parseInt(req.params.id, 10)
  /* Se algum cliente só pode usar esse prazo, apagar deixaria ele sem como fechar pedido.
     Nesse caso só desativa (some do checkout, mas não quebra o cadastro). */
  const inUse = db.prepare(`
    SELECT COUNT(*) AS n FROM customers
    WHERE allowed_payment_term_ids IS NOT NULL
      AND (allowed_payment_term_ids LIKE ? OR allowed_payment_term_ids LIKE ? OR allowed_payment_term_ids LIKE ?)
  `).get(`[${id}]`, `[${id},%`, `%,${id}%`).n

  if (inUse > 0) {
    db.prepare('UPDATE payment_terms SET is_active = 0 WHERE id = ?').run(id)
    return res.json({ ok: true, deactivated: true, message: `Prazo desativado (está vinculado a ${inUse} cliente(s), então não foi apagado).` })
  }
  db.prepare('DELETE FROM payment_terms WHERE id = ?').run(id)
  res.json({ ok: true })
})

export default router
