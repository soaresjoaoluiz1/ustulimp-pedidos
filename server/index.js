import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { existsSync } from 'fs'
import db from './db.js'

import authRoutes from './routes/auth.js'
import catalogRoutes from './routes/catalog.js'
import customerOrderRoutes from './routes/orders.js'

import adminCategoriesRoutes from './routes/admin/categories.js'
import adminProductsRoutes from './routes/admin/products.js'
import adminPriceTablesRoutes from './routes/admin/price-tables.js'
import adminCustomersRoutes from './routes/admin/customers.js'
import adminOrdersRoutes from './routes/admin/orders.js'
import adminPaymentTermsRoutes from './routes/admin/payment-terms.js'
import adminDashboardRoutes from './routes/admin/dashboard.js'
import adminUploadRoutes, { UPLOADS_DIR } from './routes/admin/upload.js'

import { requireAuth, requireAdmin } from './middleware/auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT || '3012', 10)
const NODE_ENV = process.env.NODE_ENV || 'development'
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '')  // ex: /pedidos (deploy em ustulimp.com.br/pedidos)

const app = express()

app.use(cors({
  origin: NODE_ENV === 'development' ? 'http://localhost:5177' : true,
  credentials: true
}))
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

/* Subpath /pedidos: remove o prefixo BASE do req.url pra todas as rotas rodarem no root.
   O proxy do Apache encaminha /pedidos/* SEM remover o prefixo. */
if (BASE) {
  app.use((req, _res, next) => {
    if (req.url === BASE) req.url = '/'
    else if (req.url.startsWith(BASE + '/')) req.url = req.url.slice(BASE.length)
    next()
  })
}

/* ── Healthcheck ── */
app.get('/api/health', (req, res) => {
  const counts = {
    users:        db.prepare('SELECT COUNT(*) as n FROM users').get().n,
    categories:   db.prepare('SELECT COUNT(*) as n FROM categories').get().n,
    products:     db.prepare('SELECT COUNT(*) as n FROM products').get().n,
    price_tables: db.prepare('SELECT COUNT(*) as n FROM price_tables').get().n,
    customers:    db.prepare('SELECT COUNT(*) as n FROM customers').get().n,
    orders:       db.prepare('SELECT COUNT(*) as n FROM orders').get().n
  }
  res.json({
    ok: true,
    service: 'ustulimp-pedidos',
    version: '0.1.0',
    env: NODE_ENV,
    db: 'sqlite',
    counts,
    timestamp: new Date().toISOString()
  })
})

/* ── Auth (público) ── */
app.use('/api/auth', authRoutes)

/* ── Catálogo do cliente (autenticado) ── */
app.use('/api/catalog', catalogRoutes)
app.use('/api/orders', customerOrderRoutes)

/* ── Admin (autenticado + role=admin) ── */
app.use('/api/admin', requireAuth, requireAdmin)
app.use('/api/admin/categories', adminCategoriesRoutes)
app.use('/api/admin/products', adminProductsRoutes)
app.use('/api/admin/price-tables', adminPriceTablesRoutes)
app.use('/api/admin/customers', adminCustomersRoutes)
app.use('/api/admin/orders', adminOrdersRoutes)
app.use('/api/admin/payment-terms', adminPaymentTermsRoutes)
app.use('/api/admin/dashboard', adminDashboardRoutes)
app.use('/api/admin/upload', adminUploadRoutes)

/* ── Serve uploads (público pra exibir imagens dos produtos) ── */
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', immutable: true }))

/* ── 404 nas rotas /api ── */
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' })
})

/* ── Error handler ── */
app.use((err, req, res, next) => {
  console.error('[error]', err)
  res.status(500).json({ error: err.message || 'Erro interno' })
})

/* ── Frontend buildado em produção ── */
const distDir = resolve(__dirname, '..', 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(resolve(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`[ustulimp-pedidos] Server rodando em http://localhost:${PORT}${BASE} (${NODE_ENV})`)
  console.log(`[ustulimp-pedidos] Healthcheck: http://localhost:${PORT}${BASE}/api/health`)
})
