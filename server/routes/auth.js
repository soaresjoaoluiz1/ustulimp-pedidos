import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { signToken, requireAuth } from '../middleware/auth.js'

const router = Router()

/* Freio simples de força bruta: 10 tentativas erradas por IP+email a cada 15 min.
   Login certo zera o contador. */
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_TRIES = 10
const loginTries = new Map()

function loginKey(req, email) {
  return `${req.ip}|${String(email || '').toLowerCase().trim()}`
}
function tooManyTries(key) {
  const rec = loginTries.get(key)
  if (!rec) return false
  if (Date.now() - rec.first > LOGIN_WINDOW_MS) { loginTries.delete(key); return false }
  return rec.count >= LOGIN_MAX_TRIES
}
function registerFail(key) {
  const rec = loginTries.get(key)
  if (!rec || Date.now() - rec.first > LOGIN_WINDOW_MS) loginTries.set(key, { count: 1, first: Date.now() })
  else rec.count++
}

/* Dados do cliente logado + mínimo efetivo. Usado no login E no /me pra os dois
   devolverem exatamente a mesma coisa (senão o checkout fica com dado velho). */
function loadCustomer(userId) {
  const customer = db.prepare(`
    SELECT c.*,
           pt.name as price_table_name,
           pt.slug as price_table_slug,
           pt.minimum_order_value AS price_table_min
    FROM customers c
    LEFT JOIN price_tables pt ON pt.id = c.price_table_id
    WHERE c.user_id = ?
  `).get(userId)
  if (!customer) return null
  /* Mínimo efetivo: override do cliente OU mínimo da tabela */
  customer.effective_minimum_order_value = (customer.minimum_order_value && customer.minimum_order_value > 0)
    ? customer.minimum_order_value
    : (customer.price_table_min || 0)
  return customer
}

/* POST /api/auth/login */
router.post('/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' })

  const key = loginKey(req, email)
  if (tooManyTries(key)) {
    return res.status(429).json({ error: 'Muitas tentativas. Espere 15 minutos e tente de novo.' })
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim())
  if (!user) { registerFail(key); return res.status(401).json({ error: 'Email ou senha inválidos' }) }

  const ok = bcrypt.compareSync(password, user.password)
  if (!ok) { registerFail(key); return res.status(401).json({ error: 'Email ou senha inválidos' }) }
  loginTries.delete(key)

  db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(user.id)

  const token = signToken(user)
  const customer = user.role === 'cliente' ? loadCustomer(user.id) : null

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    customer
  })
})

/* GET /api/auth/me */
router.get('/me', requireAuth, (req, res) => {
  const customer = req.user.role === 'cliente' ? loadCustomer(req.user.id) : null
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
  db.prepare(`UPDATE users SET password = ?, password_changed_at = strftime('%Y-%m-%d %H:%M:%f','now'), updated_at = datetime('now') WHERE id = ?`).run(hash, user.id)

  res.json({ ok: true, message: 'Senha alterada com sucesso' })
})

export default router
