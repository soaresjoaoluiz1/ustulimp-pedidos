/**
 * Catálogo do cliente logado. A regra de quais produtos e com qual preço fica em
 * `server/lib/catalog-query.js`, compartilhada com o link público.
 */
import { Router } from 'express'
import db from '../db.js'
import { requireAuth, requireCustomer } from '../middleware/auth.js'
import { listCatalogProducts, listCatalogCategories } from '../lib/catalog-query.js'

const router = Router()

/* GET /api/catalog — produtos da tabela do cliente logado. Filtros: ?category_id= &search= */
router.get('/', requireAuth, requireCustomer, (req, res) => {
  if (!req.customer.price_table_id) {
    return res.status(400).json({ error: 'Cliente sem tabela de preço vinculada. Contate o admin.' })
  }
  const products = listCatalogProducts({
    priceTableId: req.customer.price_table_id,
    categoryId: req.query.category_id,
    search: req.query.search,
  })
  res.json({ products, total: products.length })
})

/* GET /api/catalog/categories — categorias com contagem de produtos da tabela do cliente */
router.get('/categories', requireAuth, requireCustomer, (req, res) => {
  res.json({ categories: listCatalogCategories(req.customer.price_table_id) })
})

/* GET /api/catalog/banners — banners ativos pra slider promocional */
router.get('/banners', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT * FROM banners WHERE is_active = 1 ORDER BY position, id`).all()
  res.json({ banners: rows })
})

export default router
