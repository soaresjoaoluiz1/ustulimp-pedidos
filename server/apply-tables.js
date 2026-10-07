/**
 * Aplica as tabelas de preço do catálogo (server/data/products-catalog.js) num banco
 * que JÁ está rodando — sem apagar pedidos, clientes nem histórico.
 *
 * O que faz (pode rodar quantas vezes quiser, o resultado é o mesmo):
 *   1. cria/atualiza as tabelas de preço (nome, descrição, pedido mínimo)
 *   2. cria produto que ainda não existe (pelo SKU) e completa units_per_box / revenda sugerida
 *   3. grava o preço de cada produto em cada tabela; produto sem preço na tabela some dela
 *   4. move os clientes das tabelas antigas pra tabela indicada em MIGRAR_DE → MIGRAR_PARA
 *   5. desativa as tabelas antigas que não estão mais no catálogo
 *
 * O que NÃO faz: não mexe em nome, foto ou descrição de produto que já existe
 * (pra não desfazer ajuste feito pelo admin) e não apaga nada.
 *
 * Uso:  npm run tabelas
 */
import db from './db.js'
import { PRODUCTS, CATEGORIES, PRICE_TABLES } from './data/products-catalog.js'

/* Clientes que estavam nestas tabelas vão pra tabela destino */
const MIGRAR_DE = ['padrao']
const MIGRAR_PARA = 'revenda'

const log = (...a) => console.log('[tabelas]', ...a)

const tx = db.transaction(() => {
  /* 1. categorias que faltam */
  const catBySlug = {}
  for (const c of CATEGORIES) {
    let row = db.prepare('SELECT id FROM categories WHERE slug = ?').get(c.slug)
    if (!row) {
      const r = db.prepare('INSERT INTO categories (name, slug, icon, position) VALUES (?, ?, ?, ?)')
        .run(c.name, c.slug, c.icon, c.position)
      row = { id: r.lastInsertRowid }
      log(`categoria criada: ${c.name}`)
    }
    catBySlug[c.slug] = row.id
    catBySlug[c.name] = row.id
  }

  /* 2. tabelas de preço */
  const tableBySlug = {}
  for (const t of PRICE_TABLES) {
    const cur = db.prepare('SELECT * FROM price_tables WHERE slug = ?').get(t.slug)
    if (cur) {
      db.prepare(`UPDATE price_tables SET name = ?, description = ?, minimum_order_value = ?, show_suggested_sale = ?, is_active = 1 WHERE id = ?`)
        .run(t.name, t.description, t.minimum_order_value, t.show_suggested_sale ? 1 : 0, cur.id)
      tableBySlug[t.slug] = cur.id
      log(`tabela atualizada: ${t.name} (mínimo R$ ${t.minimum_order_value.toFixed(2)})`)
    } else {
      const r = db.prepare(`
        INSERT INTO price_tables (name, slug, description, distance_min_km, distance_max_km, minimum_order_value, show_suggested_sale)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(t.name, t.slug, t.description, t.distance_min_km, t.distance_max_km, t.minimum_order_value, t.show_suggested_sale ? 1 : 0)
      tableBySlug[t.slug] = r.lastInsertRowid
      log(`tabela criada: ${t.name} (mínimo R$ ${t.minimum_order_value.toFixed(2)})`)
    }
  }

  /* 3. produtos + preços */
  const insertProd = db.prepare(`
    INSERT INTO products (sku, name, short_use, category_id, unit, units_per_box, image_url, peso_kg, volume_m3, tags, suggested_sale_price)
    VALUES (?, ?, ?, ?, 'cx', ?, ?, ?, ?, ?, ?)
  `)
  const upsertPrice = db.prepare(`
    INSERT INTO price_table_items (price_table_id, product_id, price, is_active)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(price_table_id, product_id) DO UPDATE SET price = excluded.price, is_active = 1
  `)
  const dropPrice = db.prepare('DELETE FROM price_table_items WHERE price_table_id = ? AND product_id = ?')

  let criados = 0, precos = 0, removidos = 0
  for (const p of PRODUCTS) {
    let prod = db.prepare('SELECT * FROM products WHERE sku = ?').get(p.sku)
    if (!prod) {
      const r = insertProd.run(
        p.sku, p.name, p.short_use, catBySlug[p.category] || null,
        p.units_per_box, p.image_url, p.peso_kg, p.volume_m3,
        JSON.stringify(p.tags), p.suggested_sale_price ?? null
      )
      prod = { id: r.lastInsertRowid }
      criados++
      log(`produto criado: ${p.sku} ${p.name}`)
    } else {
      /* completa só o que é regra de negócio, sem tocar em nome/foto/descrição */
      db.prepare(`
        UPDATE products SET units_per_box = ?, suggested_sale_price = ?, unit = 'cx', updated_at = datetime('now')
        WHERE id = ?
      `).run(p.units_per_box, p.suggested_sale_price ?? null, prod.id)
    }

    for (const [slug, price] of Object.entries(p.prices)) {
      const tableId = tableBySlug[slug]
      if (!tableId) continue
      if (price == null) {
        const r = dropPrice.run(tableId, prod.id)
        if (r.changes) { removidos++; log(`${p.sku} saiu da tabela ${slug}`) }
      } else {
        upsertPrice.run(tableId, prod.id, price)
        precos++
      }
    }
  }
  log(`${criados} produto(s) criado(s) · ${precos} preço(s) gravado(s) · ${removidos} removido(s) de tabela`)

  /* 4. clientes das tabelas antigas vão pra tabela destino */
  const destino = tableBySlug[MIGRAR_PARA]
  for (const slug of MIGRAR_DE) {
    const antiga = db.prepare('SELECT * FROM price_tables WHERE slug = ?').get(slug)
    if (!antiga || !destino) continue
    const r = db.prepare(`UPDATE customers SET price_table_id = ?, updated_at = datetime('now') WHERE price_table_id = ?`)
      .run(destino, antiga.id)
    if (r.changes) log(`${r.changes} cliente(s) movido(s) da tabela "${antiga.name}" pra "${MIGRAR_PARA}"`)

    /* 5. desativa a antiga (não apaga: pedidos antigos apontam pra ela) */
    db.prepare('UPDATE price_tables SET is_active = 0 WHERE id = ?').run(antiga.id)
    log(`tabela "${antiga.name}" desativada (pedidos antigos continuam apontando pra ela)`)
  }
})

tx()

const resumo = db.prepare(`
  SELECT pt.name, pt.minimum_order_value AS minimo, pt.is_active,
         (SELECT COUNT(*) FROM price_table_items i WHERE i.price_table_id = pt.id AND i.is_active = 1) AS produtos,
         (SELECT COUNT(*) FROM customers c WHERE c.price_table_id = pt.id) AS clientes
  FROM price_tables pt ORDER BY pt.id
`).all()
console.table(resumo)
console.log('[tabelas] ✅ Concluído.')
process.exit(0)
