/**
 * Consulta de CNPJ pra preencher o cadastro do cliente.
 * Fonte: BrasilAPI (dados públicos da Receita) — sem cadastro, sem chave.
 *
 * Vai pelo server (e não direto do navegador) por 3 motivos:
 *   - evita bloqueio de CORS
 *   - guarda o resultado em cache por 24h (a API limita as consultas por minuto)
 *   - devolve os campos já no formato do nosso formulário
 */
import { Router } from 'express'

const router = Router()

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const cache = new Map()

function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '')
}

/** Valida CNPJ pelos dois dígitos verificadores (evita bater na API à toa). */
function isValidCnpj(cnpj) {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
  const calc = (len) => {
    let sum = 0, pos = len - 7
    for (let i = 0; i < len; i++) {
      sum += Number(cnpj[i]) * pos--
      if (pos < 2) pos = 9
    }
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13])
}

function fmtPhone(raw) {
  const d = onlyDigits(raw)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return raw || null
}

function fmtCep(raw) {
  const d = onlyDigits(raw)
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : (raw || null)
}

function titleCase(s) {
  if (!s) return null
  const minor = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])
  return s.toLowerCase().split(/\s+/).map((w, i) =>
    (i > 0 && minor.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ')
}

/* GET /api/admin/cnpj/:cnpj */
router.get('/:cnpj', async (req, res) => {
  const cnpj = onlyDigits(req.params.cnpj)
  if (!isValidCnpj(cnpj)) {
    return res.status(400).json({ error: 'CNPJ inválido. Confira os números.' })
  }

  const hit = cache.get(cnpj)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return res.json({ ...hit.data, cached: true })
  }

  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 10000)
    /* A BrasilAPI recusa (403) chamada sem User-Agent */
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'ustulimp-pedidos', Accept: 'application/json' },
    })
    clearTimeout(timeout)

    if (r.status === 404) return res.status(404).json({ error: 'CNPJ não encontrado na Receita.' })
    if (r.status === 429) return res.status(429).json({ error: 'Muitas consultas seguidas. Espere um minuto e tente de novo.' })
    if (!r.ok) return res.status(502).json({ error: 'A consulta de CNPJ está fora do ar. Preencha os dados à mão.' })

    const d = await r.json()
    const logradouro = [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(' ')
    const data = {
      cnpj,
      company_name: d.razao_social || null,
      trade_name: d.nome_fantasia || null,
      /* sugestão pro campo "nome do contato" (a Receita devolve tudo em CAIXA ALTA) */
      contact_suggestion: titleCase(d.nome_fantasia || d.razao_social),
      address: [titleCase(logradouro), d.numero, d.complemento, titleCase(d.bairro)]
        .filter(v => v && String(v).trim()).join(', ') || null,
      city: titleCase(d.municipio),
      state: d.uf || null,
      zip_code: fmtCep(d.cep),
      phone: fmtPhone(d.ddd_telefone_1),
      email: d.email || null,
      /* Situação cadastral: o admin decide o que fazer, o sistema só avisa */
      status: d.descricao_situacao_cadastral || null,
      active: (d.descricao_situacao_cadastral || '').toUpperCase() === 'ATIVA',
      opened_at: d.data_inicio_atividade || null,
      main_activity: d.cnae_fiscal_descricao || null,
    }

    cache.set(cnpj, { at: Date.now(), data })
    res.json(data)
  } catch (err) {
    const timedOut = err.name === 'AbortError'
    res.status(504).json({ error: timedOut ? 'A consulta demorou demais. Preencha à mão ou tente de novo.' : 'Não deu pra consultar o CNPJ agora.' })
  }
})

export default router
