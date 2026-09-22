import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { signToken, requireAuth } from '../middleware/auth.js'

const router = Router()

/* POST /api/auth/login */
router.post('/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' })

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim())
  if (!user) return res.status(401).json({ error: 'Email ou senha inválidos' })

  const ok = bcrypt.compareSync(password, user.password)
  if (!ok) return res.status(401).json({ error: 'Email ou senha inválidos' })

  db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(user.id)

  const token = signToken(user)
  let customer = null
  if (user.role === 'cliente') {
    customer = db.prepare('SELECT id, name, company_name, price_table_id, city, state FROM customers WHERE user_id = ?').get(user.id)
  }

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    customer
  })
})

/* GET /api/auth/me */
router.get('/me', requireAuth, (req, res) => {
  let customer = null
  if (req.user.role === 'cliente') {
    customer = db.prepare(`
      SELECT c.*,
             pt.name as price_table_name,
             pt.slug as price_table_slug,
             pt.minimum_order_value AS price_table_min
      FROM customers c
      LEFT JOIN price_tables pt ON pt.id = c.price_table_id
      WHERE c.user_id = ?
    `).get(req.user.id)
    if (customer) {
      /* Mínimo efetivo: override do cliente OU mínimo da tabela */
      customer.effective_minimum_order_value = (customer.minimum_order_value && customer.minimum_order_value > 0)
        ? customer.minimum_order_value
        : (customer.price_table_min || 0)
    }
  }
  res.json({ user: req.user, customer })
})

/* POST /api/auth/change-password */
router.post('/change-password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body
  if (!current_password || !new_password) return res.status(400).json({ error: 'Senha atual e nova são obrigatórias' })
  if (new_password.length < 6) return res.status(400).json({ error: 'Nova senha precisa ter ao menos 6 caracteres' })

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  const ok = bcrypt.compareSync(current_password, user.password)
  if (!ok) return res.status(401).json({ error: 'Senha atual incorreta' })

  const hash = bcrypt.hashSync(new_password, 10)
  db.prepare(`UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, user.id)

  res.json({ ok: true, message: 'Senha alterada com sucesso' })
})

export default router
