/**
 * UPDATE parcial: grava SÓ os campos que vieram no body.
 *
 * O padrão antigo (`campo = COALESCE(?, campo)`) tinha um problema silencioso:
 * mandar null pra LIMPAR um campo não limpava nada — o valor velho voltava.
 * Na prática o admin apagava a foto/observação/tabela, via "salvo" e o dado continuava lá.
 *
 * Aqui: campo ausente no body = não mexe; campo com null = grava null (limpa).
 */
export function buildUpdate(table, body, fields, { where = 'id', touchUpdatedAt = true } = {}) {
  const sets = []
  const params = []

  for (const [column, cast] of Object.entries(fields)) {
    if (body[column] === undefined) continue
    sets.push(`${column} = ?`)
    params.push(cast ? cast(body[column]) : body[column])
  }
  if (!sets.length) return null

  if (touchUpdatedAt) sets.push(`updated_at = datetime('now')`)
  return { sql: `UPDATE ${table} SET ${sets.join(', ')} WHERE ${where} = ?`, params }
}

/* Conversores usados nas rotas */
export const asText = v => (v === '' || v === null || v === undefined ? null : String(v))
export const asNumber = v => (v === '' || v === null || v === undefined ? null : Number(v))
export const asBool = v => (v ? 1 : 0)
export const asJson = v => (v === null || v === undefined ? null : JSON.stringify(v))
