import jwt from 'jsonwebtoken'
import db from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me-in-production'
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET ausente ou curto demais (mín. 32 chars). Configure nas variáveis de ambiente antes de subir.')
}
const JWT_EXPIRES_IN = '7d'

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Não autenticado' })

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = db.prepare('SELECT id, name, email, role, is_active, password_changed_at FROM users WHERE id = ?').get(payload.id)
    if (!user || !user.is_active) return res.status(401).json({ error: 'Usuário inativo ou inexistente' })
    /* Trocou/resetou a senha → tokens antigos morrem na hora */
    /* O `iat` do JWT só tem precisão de segundo, então dou 1s de folga: o token emitido
       no mesmo segundo da troca (o login novo) continua valendo; os anteriores morrem. */
    const changedAt = user.password_changed_at ? Date.parse(user.password_changed_at.replace(' ', 'T') + 'Z') : null
    if (changedAt && payload.iat && changedAt - payload.iat * 1000 >= 1000) {
      return res.status(401).json({ error: 'Sessão expirada: a senha foi alterada. Faça login de novo.' })
    }
    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' })
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito a administradores' })
  next()
}

export function requireCustomer(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' })
  if (req.user.role !== 'cliente') return res.status(403).json({ error: 'Acesso restrito a clientes' })
  /* Anexa o customer vinculado pra facilitar nas rotas */
  const customer = db.prepare('SELECT * FROM customers WHERE user_id = ?').get(req.user.id)
  if (!customer) return res.status(403).json({ error: 'Cliente sem cadastro vinculado. Contate o admin.' })
  if (!customer.is_active) return res.status(403).json({ error: 'Cadastro inativo. Contate o admin.' })
  req.customer = customer
  next()
}
