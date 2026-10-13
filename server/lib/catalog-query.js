/**
 * Catálogo de uma tabela de preço.
 *
 * Fica aqui porque DUAS rotas precisam exatamente da mesma regra: o catálogo do cliente
 * logado (`routes/catalog.js`) e o catálogo do link público (`routes/public.js`). Se cada
 * uma tivesse sua query, uma hora elas divergiriam — e divergir aqui significa mostrar
 * preço errado pra alguém.
 *
 * Regras embutidas:
 *   - só produto ativo, com preço ativo NAQUELA tabela, e com a tabela ativa
 *   - `suggested_sale_price` só sai quando a tabela manda mostrar (show_suggested_sale)
 */
import db from '../db.js'

function parseTags(row) {
  if (!row) return row
  try { row.tags = row.tags ? JSON.parse(row.tags) : [] } catch { row.tags = [] }
  return row
}

export function listCatalogProducts({ priceTableId, categoryId, search }) {
  const where = ['p.is_active = 1', 'pti.is_active = 1', 'pt.is_active = 1', 'pti.price_table_id = ?']
  const params = [priceTableId]
  if (categoryId) { where.push('p.category_id = ?'); params.push(categoryId) }
  if (search) {
    where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.short_use LIKE ?)')
    const q = `%${search}%`
    params.push(q, q, q)
  }

  return db.prepare(`
    SELECT
      p.id, p.sku, p.name, p.short_use, p.description, p.unit, p.image_url,
      p.market_price, p.units_per_box,
      CASE WHEN pt.show_suggested_sale = 1 THEN p.suggested_sale_price END AS suggested_sale_price,
      p.peso_kg, p.volume_m3, p.tags, p.featured,
      pti.price,
      c.id AS category_id, c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon
    FROM products p
    JOIN price_table_items pti ON pti.product_id = p.id
    JOIN price_tables pt ON pt.id = pti.price_table_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE ${where.join(' AND ')}
    ORDER BY c.position, p.name
  `).all(...params).map(parseTags)
}

export function listCatalogCategories(priceTableId) {
  return db.prepare(`
    SELECT c.*,
           (SELECT COUNT(*) FROM products p
            JOIN price_table_items pti ON pti.product_id = p.id
            WHERE p.category_id = c.id AND p.is_active = 1
              AND pti.price_table_id = ? AND pti.is_active = 1) AS product_count
    FROM categories c
    WHERE c.is_active = 1
    ORDER BY c.position, c.name
  `).all(priceTableId)
}
