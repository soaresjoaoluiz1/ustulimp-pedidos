/**
 * CPF e CNPJ: normalização, validação pelos dígitos verificadores e formatação.
 *
 * Usado no cadastro pelo admin e, principalmente, no pedido feito pelo link público —
 * lá o documento é a única coisa que identifica quem está comprando, então ele é
 * validado no servidor e guardado também sem máscara (`customers.document_digits`),
 * senão não dá pra reconhecer que o mesmo CNPJ já pediu antes.
 */

export function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '')
}

/** CNPJ pelos dois dígitos verificadores. */
export function isValidCnpj(value) {
  const cnpj = onlyDigits(value)
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

/** CPF pelos dois dígitos verificadores. */
export function isValidCpf(value) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const calc = (len) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10])
}

/** 'cpf' | 'cnpj' | null — o tipo vem do tamanho, nunca do que o navegador mandou. */
export function detectDocumentType(value) {
  const d = onlyDigits(value)
  if (d.length === 11) return isValidCpf(d) ? 'cpf' : null
  if (d.length === 14) return isValidCnpj(d) ? 'cnpj' : null
  return null
}

/** 000.000.000-00 ou 00.000.000/0000-00 (devolve o original se não for nenhum dos dois). */
export function formatDocument(value) {
  const d = onlyDigits(value)
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  return value || null
}

export function formatPhone(raw) {
  const d = onlyDigits(raw)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return raw || null
}

export function formatCep(raw) {
  const d = onlyDigits(raw)
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : (raw || null)
}

/** "AVENIDA OCTORINO MAESTRO" → "Avenida Octorino Maestro" (a Receita devolve em caixa alta). */
export function titleCase(s) {
  if (!s) return null
  const minor = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])
  return s.toLowerCase().split(/\s+/).map((w, i) =>
    (i > 0 && minor.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ')
}
