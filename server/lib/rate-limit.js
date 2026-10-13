/**
 * Freio de tentativas, em memória (não precisa de Redis pro tamanho desta operação).
 *
 * Usado no login e, principalmente, nas rotas do link público, que são anônimas:
 * consulta de CNPJ (chama serviço externo) e envio de pedido.
 *
 * Importante: depende de `app.set('trust proxy', 1)` no server — atrás do Apache/Passenger,
 * sem isso todo acesso chega com o mesmo IP e o freio viraria um limite global.
 */

/**
 * @param {object} opts
 * @param {number} opts.windowMs janela de tempo
 * @param {number} opts.max      tentativas permitidas na janela
 * @param {(req) => string} [opts.key] o que conta como "mesma pessoa" (padrão: IP)
 * @param {string} [opts.message] texto devolvido quando estoura
 */
export function makeLimiter({ windowMs, max, key = (req) => req.ip, message = 'Muitas tentativas seguidas. Espere um pouco e tente de novo.' }) {
  const hits = new Map()

  function cleanup(now) {
    if (hits.size < 500) return
    for (const [k, rec] of hits) if (now - rec.first > windowMs) hits.delete(k)
  }

  /** Conta uma tentativa. Devolve false quando passou do limite. */
  function consume(k) {
    const now = Date.now()
    cleanup(now)
    const rec = hits.get(k)
    if (!rec || now - rec.first > windowMs) {
      hits.set(k, { count: 1, first: now })
      return true
    }
    rec.count++
    return rec.count <= max
  }

  const middleware = (req, res, next) => {
    if (!consume(String(key(req)))) {
      return res.status(429).json({ error: message, code: 'RATE_LIMITED' })
    }
    next()
  }

  /* Pra usar fora de middleware (ex: limitar por documento, que só é conhecido depois de ler o corpo) */
  middleware.check = (k) => consume(String(k))
  middleware.reset = (k) => hits.delete(String(k))
  middleware.message = message

  return middleware
}
