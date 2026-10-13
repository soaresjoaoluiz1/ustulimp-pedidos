/**
 * Consulta de CNPJ na Receita (via BrasilAPI — dados públicos, sem cadastro e sem chave).
 *
 * Fica no servidor (e não no navegador) por 3 motivos: evita bloqueio de CORS, guarda o
 * resultado por 24h (a API limita consultas por minuto) e devolve os campos já no formato
 * do nosso formulário.
 *
 * Quem chama: o cadastro do admin e o checkout do link público — por isso a função devolve
 * tudo e cada rota escolhe o que expor (o visitante não precisa ver situação cadastral).
 */
import { isValidCnpj, onlyDigits, formatCep, formatPhone, titleCase } from './documents.js'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const cache = new Map()

export class CnpjLookupError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/**
 * Busca os dados da empresa. Lança CnpjLookupError com o status HTTP certo.
 * @returns {Promise<object>} dados normalizados (+ `cached: true` quando veio do cache)
 */
export async function lookupCnpj(value) {
  const cnpj = onlyDigits(value)
  if (!isValidCnpj(cnpj)) {
    throw new CnpjLookupError(400, 'CNPJ inválido. Confira os números.')
  }

  const hit = cache.get(cnpj)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { ...hit.data, cached: true }
  }

  let r
  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 10000)
    /* A BrasilAPI recusa (403) chamada sem User-Agent */
    r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'ustulimp-pedidos', Accept: 'application/json' },
    })
    clearTimeout(timeout)
  } catch (err) {
    const timedOut = err.name === 'AbortError'
    throw new CnpjLookupError(504, timedOut
      ? 'A consulta demorou demais. Preencha à mão ou tente de novo.'
      : 'Não deu pra consultar o CNPJ agora.')
  }

  if (r.status === 404) throw new CnpjLookupError(404, 'CNPJ não encontrado na Receita.')
  if (r.status === 429) throw new CnpjLookupError(429, 'Muitas consultas seguidas. Espere um minuto e tente de novo.')
  if (!r.ok) throw new CnpjLookupError(502, 'A consulta de CNPJ está fora do ar. Preencha os dados à mão.')

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
    zip_code: formatCep(d.cep),
    phone: formatPhone(d.ddd_telefone_1),
    email: d.email || null,
    /* Situação cadastral: o admin decide o que fazer, o sistema só avisa */
    status: d.descricao_situacao_cadastral || null,
    active: (d.descricao_situacao_cadastral || '').toUpperCase() === 'ATIVA',
    opened_at: d.data_inicio_atividade || null,
    main_activity: d.cnae_fiscal_descricao || null,
  }

  cache.set(cnpj, { at: Date.now(), data })
  return data
}

/** Só o que o formulário público precisa — sem situação cadastral, atividade e e-mail. */
export function publicCnpjFields(data) {
  return {
    cnpj: data.cnpj,
    company_name: data.company_name,
    contact_suggestion: data.contact_suggestion,
    address: data.address,
    city: data.city,
    state: data.state,
    zip_code: data.zip_code,
    phone: data.phone,
  }
}
