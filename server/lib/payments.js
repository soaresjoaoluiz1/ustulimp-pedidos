/**
 * Regras de pagamento — usadas pelo server (validação) e espelhadas no checkout (UI).
 *
 * O prazo manda na forma de pagamento:
 *   - prazo 0 dias (à vista)  → PIX ou dinheiro
 *   - prazo com dias (7, 28, 30/60…) → boleto (é o único jeito de pagar depois)
 */
import db from '../db.js'

export const PAYMENT_METHODS = {
  boleto: 'Boleto',
  pix: 'PIX',
  dinheiro: 'Dinheiro',
}

/** Formas de pagamento válidas pra um prazo (campo `days`: "0", "28", "30,60"…). */
export function methodsForTerm(days) {
  const list = String(days ?? '').split(',').map(d => parseFloat(d.trim())).filter(n => Number.isFinite(n))
  const aVista = list.length === 0 || list.every(d => d === 0)
  return aVista ? ['pix', 'dinheiro'] : ['boleto']
}

/** Prazos que ESTE cliente pode usar (respeita allowed_payment_term_ids). */
export function allowedTermsForCustomer(customer) {
  let allowedIds = null
  try {
    allowedIds = customer?.allowed_payment_term_ids ? JSON.parse(customer.allowed_payment_term_ids) : null
  } catch {
    allowedIds = null
  }

  if (Array.isArray(allowedIds) && allowedIds.length > 0) {
    const placeholders = allowedIds.map(() => '?').join(',')
    return db.prepare(`
      SELECT id, label, days FROM payment_terms
      WHERE is_active = 1 AND id IN (${placeholders})
      ORDER BY position, id
    `).all(...allowedIds)
  }

  return db.prepare(`
    SELECT id, label, days FROM payment_terms
    WHERE is_active = 1 ORDER BY position, id
  `).all()
}
