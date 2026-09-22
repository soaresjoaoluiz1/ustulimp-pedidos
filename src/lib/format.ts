export const fmtBRL = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const fmtNumber = (v: number | null | undefined, digits = 0) =>
  (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** O SQLite grava datetime('now') em UTC sem fuso. Sem o "Z" o navegador lia como hora local (3h adiantado). */
function parseDbDate(iso: string) {
  const s = iso.includes('T') ? iso : iso.replace(' ', 'T')
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z')
}

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = parseDbDate(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = parseDbDate(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const fmtRelative = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = parseDbDate(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d atrás`
  return fmtDate(iso)
}

export const STATUS_LABEL: Record<string, string> = {
  novo: 'Novo',
  em_analise: 'Em análise',
  confirmado: 'Confirmado',
  separado: 'Separado',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
}

export const STATUS_COLOR: Record<string, string> = {
  novo: 'bg-blue-100 text-blue-700',
  em_analise: 'bg-amber-100 text-amber-700',
  confirmado: 'bg-emerald-100 text-emerald-700',
  separado: 'bg-violet-100 text-violet-700',
  entregue: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700'
}
