import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../../db.js'

const router = Router()

function generatePassword() {
  return Math.random().toString(36).slice(-8)
}

function parseAllowedTerms(row) {
  if (!row) return row
  try {
    row.allowed_payment_term_ids = row.allowed_payment_term_ids
      ? JSON.parse(row.allowed_payment_term_ids)
      : null
  } catch {
    row.allowed_payment_term_ids = null
  }
  return row
}

/* GET /api/admin/customers?search=&active=1&price_table_id= */
router.get('/', (req, res) => {
  const { search, active, price_table_id } = req.query
  const where = []
  const params = []
  if (active !== undefined) { where.push('c.is_active = ?'); params.push(active === '1' ? 1 : 0) }
  if (price_table_id) { where.push('c.price_table_id = ?'); params.push(price_table_id) }
  if (search) {
    where.push('(c.name LIKE ? OR c.company_name LIKE ? OR c.document LIKE ? OR u.email LIKE ?)')
    const q = `%${search}%`
    params.push(q, q, q, q)
  }

  const rows = db.prepare(`
    SELECT
      c.*,
      u.email, u.last_login_at, u.is_active AS user_active,
      pt.name AS price_table_name, pt.slug AS price_table_slug,
      (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS orders_count,
      (SELECT COALESCE(SUM(o.total_value), 0) FROM orders o WHERE o.customer_id = c.id AND o.status NOT IN ('cancelado')) AS total_spent
    FROM customers c
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN price_tables pt ON pt.id = c.price_table_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY c.created_at DESC
  `).all(...params).map(parseAllowedTerms)

  res.json({ customers: rows })
})

/* GET /api/admin/customers/:id */
router.get('/:id', (req, res) => {
  const customer = parseAllowedTerms(db.prepare(`
    SELECT c.*, u.email, u.is_active AS user_active, u.last_login_at,
           pt.name AS price_table_name
    FROM customers c
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN price_tables pt ON pt.id = c.price_table_id
    WHERE c.id = ?
  `).get(req.params.id))
  if (!customer) return res.status(404).json({ error: 'Cliente não encontrado' })

  const orders = db.prepare(`
    SELECT id, order_number, status, total_value, items_count, created_at
    FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 30
  `).all(customer.id)

  res.json({ customer, orders })
})

/* POST /api/admin/customers — cria customer + user vinculado */
router.post('/', (req, res) => {
  const {
    name, company_name, email, document, document_type,
    phone, whatsapp, city, state, address, zip_code, distance_km,
    price_table_id, minimum_order_value, notes, password,
    allowed_payment_term_ids
  } = req.body
  if (!name || !email) return res.status(400).json({ error: 'Nome e email são obrigatórios' })

  const emailNorm = email.toLowerCase().trim()
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(emailNorm)
  if (exists) return res.status(409).json({ error: 'Já existe usuário com esse email' })

  const tempPassword = password || generatePassword()
  const hash = bcrypt.hashSync(tempPassword, 10)

  let userId, customerId
  const tx = db.transaction(() => {
    const u = db.prepare(`
      INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'cliente')
    `).run(name, emailNorm, hash)
    userId = u.lastInsertRowid

    const c = db.prepare(`
      INSERT INTO customers (
        user_id, name, company_name, document, document_type,
        phone, whatsapp, city, state, address, zip_code, distance_km,
        price_table_id, minimum_order_value, notes, allowed_payment_term_ids
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, name, company_name || null,
      document || null, document_type || null,
      phone || null, whatsapp || null,
      city || null, state || null, address || null, zip_code || null,
      distance_km || null,
      price_table_id || null,
      minimum_order_value || 0,
      notes || null,
      Array.isArray(allowed_payment_term_ids) && allowed_payment_term_ids.length > 0
        ? JSON.stringify(allowed_payment_term_ids.map(Number))
        : null
    )
    customerId = c.lastInsertRowid
  })
  tx()

  res.status(201).json({
    id: customerId,
    user_id: userId,
    email: emailNorm,
    temp_password: tempPassword,
    message: 'Cliente criado. Envie email + senha temporária pelo WhatsApp.'
  })
})

/* PUT /api/admin/customers/:id */
router.put('/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  if (!cur) return res.status(404).json({ error: 'Cliente não encontrado' })
  const b = req.body
  /* allowed_payment_term_ids: undefined = não muda; null/[] = libera todos; [ids] = restringe */
  let paymentTermsValue = undefined
  if (b.allowed_payment_term_ids !== undefined) {
    paymentTermsValue = (Array.isArray(b.allowed_payment_term_ids) && b.allowed_payment_term_ids.length > 0)
      ? JSON.stringify(b.allowed_payment_term_ids.map(Number))
      : null
  }

  db.prepare(`
    UPDATE customers SET
      name = COALESCE(?, name),
      company_name = COALESCE(?, company_name),
      document = COALESCE(?, document),
      document_type = COALESCE(?, document_type),
      phone = COALESCE(?, phone),
      whatsapp = COALESCE(?, whatsapp),
      city = COALESCE(?, city),
      state = COALESCE(?, state),
      address = COALESCE(?, address),
      zip_code = COALESCE(?, zip_code),
      distance_km = COALESCE(?, distance_km),
      price_table_id = COALESCE(?, price_table_id),
      minimum_order_value = COALESCE(?, minimum_order_value),
      notes = COALESCE(?, notes),
      is_active = COALESCE(?, is_active),
      allowed_payment_term_ids = CASE WHEN ? = 'KEEP' THEN allowed_payment_term_ids ELSE ? END,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    b.name ?? null, b.company_name ?? null, b.document ?? null, b.document_type ?? null,
    b.phone ?? null, b.whatsapp ?? null, b.city ?? null, b.state ?? null,
    b.address ?? null, b.zip_code ?? null, b.distance_km ?? null,
    b.price_table_id ?? null, b.minimum_order_value ?? null, b.notes ?? null,
    b.is_active === undefined ? null : (b.is_active ? 1 : 0),
    paymentTermsValue === undefined ? 'KEEP' : 'UPDATE',
    paymentTermsValue === undefined ? null : paymentTermsValue,
    req.params.id
  )
  /* Sincroniza is_active no user vinculado */
  if (b.is_active !== undefined && cur.user_id) {
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(b.is_active ? 1 : 0, cur.user_id)
  }
  res.json({ ok: true })
})

/* POST /api/admin/customers/:id/reset-password */
router.post('/:id/reset-password', (req, res) => {
  const cur = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  if (!cur) return res.status(404).json({ error: 'Cliente não encontrado' })
  if (!cur.user_id) return res.status(400).json({ error: 'Cliente sem user vinculado' })

  const newPass = generatePassword()
  const hash = bcrypt.hashSync(newPass, 10)
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, cur.user_id)
  res.json({ ok: true, temp_password: newPass })
})

export default router
