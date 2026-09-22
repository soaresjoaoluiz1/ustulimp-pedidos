/** Utilidades de embalagem (2L/5L) e venda por caixa. */

/** Extrai a embalagem do nome (ex: "Max 20L" → {qty:20, unit:'L'}; "Pasta 3,6KG" → {qty:3.6, unit:'KG'}). */
export function parsePack(name?: string): { qty: number; unit: 'L' | 'KG' } | null {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(L|KG)\b/i)
  if (!m) return null
  return { qty: parseFloat(m[1].replace(',', '.')), unit: m[2].toUpperCase() as 'L' | 'KG' }
}

/** Nome-base do produto sem a embalagem (ex: "Cremol 05 20L" → "Cremol 05"). */
export function baseName(name?: string): string {
  const n = name || ''
  return n.replace(/\s*\d+(?:[.,]\d+)?\s*(?:L|KG)\s*$/i, '').trim() || n
}

/** Rótulo curto da embalagem (ex: "Cremol 05 20L" → "20L"). */
export function packLabel(name?: string): string {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(L|KG)\s*$/i)
  return m ? (m[1].replace(/\s+/g, '') + m[2].toUpperCase()) : (name || '')
}

/** Venda por caixa (Ustulimp): preço da tabela = preço da CAIXA. Devolve o preço por unidade e o rótulo "Cx c/ 6 un." */
export function boxInfo(price?: number, unitsPerBox?: number | null) {
  const n = unitsPerBox && unitsPerBox > 0 ? unitsPerBox : null
  return {
    units: n,
    perUnit: n && price ? price / n : null,
    label: n ? `Cx c/ ${n} un.` : null,
  }
}
