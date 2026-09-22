/**
 * Seed/importer.
 * Lê o catálogo (server/data/products-catalog.js) e popula o banco com:
 *   - 1 admin user (admin@ustulimp.com.br / admin123 — TROCAR no primeiro acesso)
 *   - 6 categorias
 *   - 29 produtos (tabela Ustulimp set/2026)
 *   - 1 tabela de preço (Padrão, pedido mínimo R$ 500)
 *   - 7 prazos de pagamento padrão
 *
 * Uso:
 *   npm run seed         # roda só se o banco estiver vazio
 *   npm run seed:reset   # limpa tudo e re-popula
 */
import bcrypt from 'bcryptjs'
import db from './db.js'
import { PRODUCTS, CATEGORIES, PRICE_TABLES, PAYMENT_TERMS } from './data/products-catalog.js'

const RESET = process.argv.includes('--reset')

const ADMIN_EMAIL = 'admin@ustulimp.com.br'
const ADMIN_PASSWORD = 'admin123'
const ADMIN_NAME = 'Administrador Ustulimp'

function alreadySeeded() {
  const row = db.prepare('SELECT COUNT(*) as n FROM products').get()
  return row.n > 0
}

function reset() {
  console.log('[seed] RESET — limpando dados…')
  const tables = ['order_status_history', 'order_items', 'orders', 'price_table_items',
                  'price_tables', 'products', 'categories', 'banners', 'payment_terms',
                  'customers', 'users']
  db.exec(tables.map(t => `DELETE FROM ${t};`).join('\n'))
  /* Reset autoincrement */
  db.exec(`DELETE FROM sqlite_sequence WHERE name IN (${tables.map(t => `'${t}'`).join(',')});`)
}

function seedAdmin() {
  const password = bcrypt.hashSync(ADMIN_PASSWORD, 10)
  const stmt = db.prepare(`
    INSERT INTO users (name, email, password, role)
    VALUES (?, ?, ?, 'admin')
  `)
  const r = stmt.run(ADMIN_NAME, ADMIN_EMAIL, password)
  console.log(`[seed] Admin criado #${r.lastInsertRowid} (${ADMIN_EMAIL} / ${ADMIN_PASSWORD})`)
}

function seedCategories() {
  const stmt = db.prepare(`
    INSERT INTO categories (name, slug, icon, position)
    VALUES (?, ?, ?, ?)
  `)
  const map = {}
  CATEGORIES.forEach(c => {
    const r = stmt.run(c.name, c.slug, c.icon, c.position)
    map[c.name] = r.lastInsertRowid
  })
  console.log(`[seed] ${CATEGORIES.length} categorias criadas`)
  return map
}

function seedPriceTables() {
  const stmt = db.prepare(`
    INSERT INTO price_tables (name, slug, description, distance_min_km, distance_max_km, minimum_order_value)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const ids = []
  PRICE_TABLES.forEach(t => {
    const r = stmt.run(t.name, t.slug, t.description, t.distance_min_km, t.distance_max_km, t.minimum_order_value)
    ids.push(r.lastInsertRowid)
  })
  console.log(`[seed] ${PRICE_TABLES.length} tabelas de preço criadas`)
  return ids
}

function seedPaymentTerms() {
  const stmt = db.prepare(`
    INSERT INTO payment_terms (label, days, position)
    VALUES (?, ?, ?)
  `)
  PAYMENT_TERMS.forEach(t => stmt.run(t.label, t.days, t.position))
  console.log(`[seed] ${PAYMENT_TERMS.length} prazos de pagamento criados`)
}

function seedProducts(catMap, priceTableIds) {
  const insertProd = db.prepare(`
    INSERT INTO products (sku, name, short_use, description, category_id, unit, units_per_box, image_url, peso_kg, volume_m3, tags)
    VALUES (?, ?, ?, ?, ?, 'cx', ?, ?, ?, ?, ?)
  `)
  const insertPrice = db.prepare(`
    INSERT INTO price_table_items (price_table_id, product_id, price)
    VALUES (?, ?, ?)
  `)

  const tx = db.transaction(() => {
    PRODUCTS.forEach(p => {
      const catId = catMap[p.category] || null
      const r = insertProd.run(
        p.sku, p.name, p.short_use, p.description || null, catId,
        p.units_per_box, p.image_url, p.peso_kg, p.volume_m3, JSON.stringify(p.tags)
      )
      const productId = r.lastInsertRowid
      // Preço da CAIXA em todas as tabelas (admin diferencia depois)
      priceTableIds.forEach(tableId => {
        insertPrice.run(tableId, productId, p.box_price)
      })
    })
  })
  tx()
  console.log(`[seed] ${PRODUCTS.length} produtos criados (× ${priceTableIds.length} tabelas = ${PRODUCTS.length * priceTableIds.length} linhas de preço)`)
}

/* ── EXECUÇÃO ── */
console.log('[seed] Iniciando seed…')

if (RESET) reset()
else if (alreadySeeded()) {
  console.log('[seed] Banco já populado. Use `npm run seed:reset` para resetar e recriar.')
  process.exit(0)
}

seedAdmin()
const catMap = seedCategories()
const priceTableIds = seedPriceTables()
seedPaymentTerms()
seedProducts(catMap, priceTableIds)

console.log('\n[seed] ✅ Concluído!')
console.log(`[seed] Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (TROCAR após primeiro login)\n`)
process.exit(0)
