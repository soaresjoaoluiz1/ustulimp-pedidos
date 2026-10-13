/**
 * Quem compra pelo link aberto vira cliente de verdade — só que SEM login
 * (`customers.user_id` fica nulo). O admin cria o acesso depois, se quiser.
 *
 * O documento é a chave: é a única coisa que identifica quem está comprando.
 * Por isso ele é guardado também sem máscara (`document_digits`).
 *
 * Regras (rodam dentro da transação do pedido, senão dois cliques criam cliente duplicado):
 *   - documento novo        → cria o cliente na tabela do link
 *   - já pediu pelo link    → reaproveita e só preenche campo que estava vazio
 *   - já é cliente com login → reaproveita o cadastro e NÃO altera nada dele
 */
import db from '../db.js'
import { buildUpdate, asText } from './update.js'
import { onlyDigits, formatDocument, detectDocumentType } from './documents.js'

export function findCustomerByDocument(document) {
  const digits = onlyDigits(document)
  if (!digits) return null
  const rows = db.prepare('SELECT * FROM customers WHERE document_digits = ? ORDER BY id').all(digits)
  if (!rows.length) return null
  /* Base legada pode ter duplicata: prefere quem tem login, senão o mais recente */
  return rows.find(r => r.user_id) || rows[rows.length - 1]
}

/**
 * @returns {{ customer: object, created: boolean }}
 */
export function resolveGuestCustomer({ table, data }) {
  const digits = onlyDigits(data.document)
  const existing = findCustomerByDocument(digits)

  if (existing) {
    /* Cadastro com login é intocável: nem dados, nem tabela, nem senha. */
    if (!existing.user_id) {
      /* Veio do link antes: completa só o que está vazio. Não mexe em tabela nem em
         pedido mínimo, que o admin pode ter ajustado na mão. */
      const fill = {}
      for (const [field, value] of Object.entries({
        name: data.name,
        company_name: data.company_name,
        phone: data.whatsapp,
        whatsapp: data.whatsapp,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code,
      })) {
        if (value && !existing[field]) fill[field] = value
      }
      const upd = Object.keys(fill).length
        ? buildUpdate('customers', fill, Object.fromEntries(Object.keys(fill).map(k => [k, asText])))
        : null
      if (upd) db.prepare(upd.sql).run(...upd.params, existing.id)
    }
    return { customer: db.prepare('SELECT * FROM customers WHERE id = ?').get(existing.id), created: false }
  }

  const r = db.prepare(`
    INSERT INTO customers (
      user_id, name, company_name, document, document_digits, document_type,
      phone, whatsapp, email, address, city, state, zip_code,
      price_table_id, minimum_order_value, origin, is_active
    ) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'link', 1)
  `).run(
    data.name, data.company_name || null,
    formatDocument(digits), digits, detectDocumentType(digits),
    data.whatsapp || null, data.whatsapp || null, data.email || null,
    data.address || null, data.city || null, data.state || null, data.zip_code || null,
    table.id
  )
  return { customer: db.prepare('SELECT * FROM customers WHERE id = ?').get(r.lastInsertRowid), created: true }
}
