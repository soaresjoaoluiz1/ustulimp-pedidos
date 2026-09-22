/**
 * Atualiza o image_url dos produtos existentes pelo SKU, a partir do catálogo.
 * NÃO apaga nada: só faz UPDATE. Por padrão só preenche produtos SEM foto
 * (não sobrescreve foto enviada pelo admin). Use --force pra sobrescrever.
 *
 * Uso:
 *   npm run seed:images
 *   npm run seed:images:force
 */
import db from './db.js'
import { PRODUCTS } from './data/products-catalog.js'

const FORCE = process.argv.includes('--force')
const stmt = db.prepare(`
  UPDATE products SET image_url = ?, updated_at = datetime('now')
  WHERE sku = ? ${FORCE ? '' : "AND (image_url IS NULL OR image_url = '')"}
`)

let touched = 0
db.transaction(() => {
  for (const p of PRODUCTS) {
    if (!p.image_url) continue
    touched += stmt.run(p.image_url, p.sku).changes
  }
})()

console.log(`[seed:images] ${touched} produto(s) atualizado(s)${FORCE ? ' (--force)' : ''}.`)
process.exit(0)
