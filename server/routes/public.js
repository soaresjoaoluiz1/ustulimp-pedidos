/**
 * Catálogo com LINK ABERTO (sem login).
 *
 * Cada tabela de preço pode ter um link `/pedidos/c/<token>`. Quem abre vê os produtos
 * com os preços daquela tabela, monta o pedido e só no fim informa os dados e o endereço
 * de entrega — sem criar senha.
 *
 * Princípios:
 *   - a tabela vem SEMPRE do token; preço vem SEMPRE do banco
 *   - token errado, link pausado e tabela inativa devolvem exatamente a mesma resposta,
 *     pra ninguém descobrir links chutando
 *   - nada daqui revela id de tabela, outras tabelas ou dados de outros clientes
 */
import { Router } from 'express'
import db from '../db.js'
import { listCatalogProducts, listCatalogCategories } from '../lib/catalog-query.js'
import { allowedTermsForCustomer, methodsForTerm } from '../lib/payments.js'
import { lookupCnpj, publicCnpjFields, CnpjLookupError } from '../lib/cnpj-lookup.js'
import { makeLimiter } from '../lib/rate-limit.js'
import { onlyDigits, detectDocumentType } from '../lib/documents.js'
import { resolveGuestCustomer, findCustomerByDocument } from '../lib/guest-customer.js'
import {
  OrderError, resolvePayment, priceOrderItems,
  effectiveMinimum, assertMinimum, createOrder, sendOrderEmailsInBackground,
} from '../lib/order-create.js'

const router = Router()

const NOT_FOUND = { error: 'Link inválido ou expirado. Peça um link novo ao vendedor.' }

/* Freios: o catálogo é folgado, a consulta de CNPJ é apertada (chama serviço externo)
   e o envio de pedido é limitado por IP e, mais abaixo, por documento. */
const catalogLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, max: 180 })
const cnpjLimiter = makeLimiter({ windowMs: 60 * 60 * 1000, max: 15, message: 'Muitas consultas de CNPJ. Espere alguns minutos.' })
/* Tentativa que o formulário recusa (dado faltando, documento errado) NÃO gasta cota:
   quem está preenchendo errado não pode ficar travado. O freio de tentativa é folgado e
   serve contra robô; o apertado só conta pedido que realmente entrou. */
const attemptLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, max: 60, message: 'Muitas tentativas seguidas. Espere um pouco e tente de novo.' })
/* Em produção o limite é apertado; fora dela fica folgado pra não atrapalhar teste manual
   e a suíte de regressão (que envia vários pedidos seguidos do mesmo endereço). */
const PROD = process.env.NODE_ENV === 'production'
const orderLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.PUBLIC_ORDER_MAX || (PROD ? 8 : 100)),
  message: 'Muitos pedidos seguidos deste acesso. Espere um pouco ou chame no WhatsApp.',
})
const documentLimiter = makeLimiter({
  windowMs: 24 * 60 * 60 * 1000,
  max: Number(process.env.PUBLIC_ORDER_MAX_PER_DOC || (PROD ? 5 : 100)),
})

/** Tabela do token, ou null. Não diferencia os motivos de propósito. */
function resolvePublicTable(token) {
  if (!token || typeof token !== 'string' || token.length < 10) return null
  return db.prepare(`
    SELECT * FROM price_tables
    WHERE public_token = ? AND public_enabled = 1 AND is_active = 1
  `).get(token) || null
}

function noIndex(res) {
  res.set('X-Robots-Tag', 'noindex, nofollow')
  res.set('Cache-Control', 'private, no-store')
}

/* ── GET /api/public/catalog/:token ── */
router.get('/catalog/:token', catalogLimiter, (req, res) => {
  const table = resolvePublicTable(req.params.token)
  if (!table) return res.status(404).json(NOT_FOUND)
  noIndex(res)

  const products = listCatalogProducts({
    priceTableId: table.id,
    categoryId: req.query.category_id,
    search: req.query.search,
  })

  res.json({
    /* Nada de id nem slug da tabela aqui */
    table: {
      name: table.name,
      description: table.description,
      minimum_order_value: table.minimum_order_value || 0,
      show_suggested_sale: table.show_suggested_sale === 1,
    },
    products,
    categories: listCatalogCategories(table.id),
    payment_terms: allowedTermsForCustomer(null).map(t => ({ ...t, methods: methodsForTerm(t.days) })),
  })
})

/* ── GET /api/public/cnpj/:token/:cnpj ──
   O token no caminho evita que isto vire uma consulta aberta à Receita. */
router.get('/cnpj/:token/:cnpj', cnpjLimiter, async (req, res) => {
  if (!resolvePublicTable(req.params.token)) return res.status(404).json(NOT_FOUND)
  noIndex(res)
  try {
    res.json(publicCnpjFields(await lookupCnpj(req.params.cnpj)))
  } catch (err) {
    if (err instanceof CnpjLookupError) return res.status(err.status).json({ error: err.message })
    res.status(504).json({ error: 'Não deu pra consultar o CNPJ agora.' })
  }
})

/** Texto obrigatório, com tamanho máximo (entrada anônima precisa de limite). */
function text(value, { field, min = 0, max = 200, required = false }) {
  const v = typeof value === 'string' ? value.trim() : ''
  if (!v) {
    if (required) throw new OrderError(`Preencha ${field}.`)
    return null
  }
  if (v.length < min) throw new OrderError(`${field} está curto demais.`)
  return v.slice(0, max)
}

function validateGuest(body) {
  const c = body.customer || {}
  const document = onlyDigits(c.document)
  const documentType = detectDocumentType(document)
  if (!documentType) {
    throw new OrderError('CPF ou CNPJ inválido. Confira os números.', { code: 'INVALID_DOCUMENT' })
  }

  const whatsapp = onlyDigits(c.whatsapp || c.phone)
  if (whatsapp.length < 10 || whatsapp.length > 11) {
    throw new OrderError('WhatsApp inválido. Use DDD + número.', { code: 'INVALID_PHONE' })
  }

  const email = text(c.email, { field: 'o e-mail', max: 120 })
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new OrderError('E-mail inválido.', { code: 'INVALID_EMAIL' })
  }

  return {
    name: text(c.name, { field: 'o seu nome', min: 3, max: 120, required: true }),
    company_name: text(c.company_name, { field: 'a empresa', max: 120 }),
    document,
    document_type: documentType,
    whatsapp,
    email,
    /* Entrega = endereço informado aqui */
    address: text(c.address, { field: 'o endereço de entrega', min: 5, max: 200, required: true }),
    city: text(c.city, { field: 'a cidade', min: 2, max: 80, required: true }),
    state: (text(c.state, { field: 'o estado (UF)', min: 2, max: 2, required: true }) || '').toUpperCase(),
    zip_code: text(c.zip_code, { field: 'o CEP', max: 20 }),
  }
}

/* ── POST /api/public/orders/:token ── */
router.post('/orders/:token', attemptLimiter, (req, res, next) => {
  const table = resolvePublicTable(req.params.token)
  if (!table) return res.status(404).json(NOT_FOUND)
  noIndex(res)

  try {
    /* Armadilha pra robô: campo escondido preenchido ou formulário enviado rápido demais */
    if (req.body._hp || (Number(req.body.elapsed_ms) > 0 && Number(req.body.elapsed_ms) < 3000)) {
      return res.status(429).json({ error: attemptLimiter.message, code: 'RATE_LIMITED' })
    }

    const guest = validateGuest(req.body)
    const { term } = resolvePayment({
      customer: null,                 // link aberto = todos os prazos ativos
      payment_term: req.body.payment_term,
      payment_method: req.body.payment_method,
    })

    /* Preço SEMPRE da tabela do link. O que vier de preço no corpo é ignorado. */
    const priced = priceOrderItems({ priceTableId: table.id, items: req.body.items })

    /* Pedido mínimo antes de gastar cota: quem está montando o carrinho ainda não pediu nada.
       (É conferido de novo dentro da transação, com o cliente já resolvido.) */
    const jaCliente = findCustomerByDocument(guest.document)
    assertMinimum({ minimum: effectiveMinimum({ customer: jaCliente, table }), subtotal: priced.subtotal })

    /* Só agora, com o pedido válido, conta a cota: por acesso e por documento */
    if (!orderLimiter.check(req.ip)) {
      return res.status(429).json({ error: orderLimiter.message, code: 'RATE_LIMITED' })
    }
    if (!documentLimiter.check(guest.document)) {
      return res.status(429).json({
        error: 'Já recebemos vários pedidos com esse documento hoje. Chame no WhatsApp pra finalizar.',
        code: 'RATE_LIMITED',
      })
    }

    let customer
    const { orderId, orderNumber } = createOrder({
      priceTableId: table.id,
      priced, term,
      payment_method: req.body.payment_method,
      notes: text(req.body.notes, { field: 'as observações', max: 500 }),
      delivery: {
        address: guest.address,
        city: guest.city,
        state: guest.state,
        zip_code: guest.zip_code,
      },
      source: 'public_link',
      publicToken: req.params.token,
      changedByUserId: null,
      historyNote: `Pedido recebido pelo link público da tabela "${table.name}"`,
      beforeInsert: () => {
        const resolved = resolveGuestCustomer({ table, data: guest })
        customer = resolved.customer
        /* Mínimo: override do cliente (se já existir) tem prioridade sobre o da tabela */
        assertMinimum({
          minimum: effectiveMinimum({ customer, table }),
          subtotal: priced.subtotal,
        })
        return { customerId: customer.id }
      },
    })

    sendOrderEmailsInBackground({ orderId, customer, userEmail: guest.email, viaPublicLink: true })

    /* Sem `id`: não existe tela pública de acompanhamento do pedido */
    res.status(201).json({
      order_number: orderNumber,
      total_value: priced.subtotal,
      items_count: priced.items.length,
      boxes_count: priced.boxes,
      message: 'Pedido enviado! Um consultor entra em contato pra confirmar entrega e pagamento.',
    })
  } catch (err) {
    if (err instanceof OrderError) return res.status(err.status).json({ error: err.message, ...err.extra })
    next(err)
  }
})

export default router
