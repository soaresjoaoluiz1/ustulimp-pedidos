import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, 'data')
mkdirSync(dataDir, { recursive: true })

const dbPath = resolve(dataDir, 'ustulimp-pedidos.db')

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  /* ── USERS: admin + cliente ── */
  CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    password        TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('admin','cliente')),
    avatar_url      TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    last_login_at   TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── CUSTOMERS: dados do revendedor (1:1 com user role=cliente) ── */
  CREATE TABLE IF NOT EXISTS customers (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id               INTEGER UNIQUE,
    name                  TEXT NOT NULL,
    company_name          TEXT,
    document              TEXT,                  /* CPF ou CNPJ */
    document_type         TEXT CHECK (document_type IN ('cpf','cnpj')),
    phone                 TEXT,
    whatsapp              TEXT,
    city                  TEXT,
    state                 TEXT,
    address               TEXT,
    zip_code              TEXT,
    distance_km           REAL,
    price_table_id        INTEGER,
    minimum_order_value   REAL DEFAULT 0,
    notes                 TEXT,
    is_active             INTEGER NOT NULL DEFAULT 1,
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (price_table_id) REFERENCES price_tables(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
  CREATE INDEX IF NOT EXISTS idx_customers_table ON customers(price_table_id);

  /* ── CATEGORIES: agrupamento de produtos ── */
  CREATE TABLE IF NOT EXISTS categories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL UNIQUE,
    slug          TEXT NOT NULL UNIQUE,
    icon          TEXT,                          /* emoji ou path */
    description   TEXT,
    position      INTEGER NOT NULL DEFAULT 0,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── PRODUCTS: cadastro único ── */
  CREATE TABLE IF NOT EXISTS products (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sku             TEXT UNIQUE,                 /* código do catálogo: ex "4147" */
    name            TEXT NOT NULL,
    short_use       TEXT,                        /* uso curto: "Radiador, bateria" */
    description     TEXT,                        /* descrição longa em HTML */
    category_id     INTEGER,
    unit            TEXT DEFAULT 'un',           /* un, L, kg */
    image_url       TEXT,
    market_price    REAL,                        /* preço médio mercado (referência) */
    peso_kg         REAL DEFAULT 0,              /* pra resumo de transporte */
    volume_m3       REAL DEFAULT 0,              /* pra resumo de transporte */
    tags            TEXT,                        /* JSON array ["Lava-Jato","Premium"] */
    featured        INTEGER NOT NULL DEFAULT 0,  /* 1 = aparece no banner/destaques */
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

  /* ── PRICE_TABLES: tabelas de preço (Próxima, Interior, Atacado…) ── */
  CREATE TABLE IF NOT EXISTS price_tables (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT NOT NULL UNIQUE,
    slug                  TEXT NOT NULL UNIQUE,
    description           TEXT,
    distance_min_km       REAL,
    distance_max_km       REAL,
    minimum_order_value   REAL DEFAULT 0,
    is_active             INTEGER NOT NULL DEFAULT 1,
    created_at            TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── PRICE_TABLE_ITEMS: preço de cada produto em cada tabela ── */
  /* IMPORTANTE: produto sem linha aqui NÃO aparece pra cliente daquela tabela */
  CREATE TABLE IF NOT EXISTS price_table_items (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    price_table_id    INTEGER NOT NULL,
    product_id        INTEGER NOT NULL,
    price             REAL NOT NULL,
    is_active         INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (price_table_id) REFERENCES price_tables(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(price_table_id, product_id)
  );
  CREATE INDEX IF NOT EXISTS idx_pti_table ON price_table_items(price_table_id);
  CREATE INDEX IF NOT EXISTS idx_pti_product ON price_table_items(product_id);

  /* ── PAYMENT_TERMS: prazos de pagamento (20, 30, 40, 50, 60, 70 dias) ── */
  CREATE TABLE IF NOT EXISTS payment_terms (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    label         TEXT NOT NULL,                 /* "30 dias", "20/30/40", etc */
    days          TEXT NOT NULL,                 /* "30" ou "20,30,40" */
    is_active     INTEGER NOT NULL DEFAULT 1,
    position      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  /* ── ORDERS: pedidos ── */
  CREATE TABLE IF NOT EXISTS orders (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number          TEXT NOT NULL UNIQUE,  /* ex: PED-2026-00001 */
    customer_id           INTEGER NOT NULL,
    price_table_id        INTEGER NOT NULL,      /* snapshot da tabela usada */
    status                TEXT NOT NULL DEFAULT 'novo'
                          CHECK (status IN ('novo','em_analise','confirmado','separado','entregue','cancelado')),
    subtotal              REAL NOT NULL DEFAULT 0,
    discount              REAL NOT NULL DEFAULT 0,
    total_value           REAL NOT NULL DEFAULT 0,
    payment_term          TEXT,                  /* "30 dias", "20/30/40" */
    payment_method        TEXT,                  /* "boleto", "pix", "dinheiro" */
    notes                 TEXT,                  /* observações do cliente */
    admin_notes           TEXT,                  /* observações internas */
    volume_total_m3       REAL DEFAULT 0,
    peso_total_kg         REAL DEFAULT 0,
    items_count           INTEGER NOT NULL DEFAULT 0,
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (price_table_id) REFERENCES price_tables(id) ON DELETE RESTRICT
  );
  CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

  /* ── ORDER_ITEMS: itens com SNAPSHOT (preço/nome travado no momento do pedido) ── */
  CREATE TABLE IF NOT EXISTS order_items (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id                  INTEGER NOT NULL,
    product_id                INTEGER NOT NULL,
    product_name_snapshot     TEXT NOT NULL,
    product_sku_snapshot      TEXT,
    unit_price_snapshot       REAL NOT NULL,
    quantity                  REAL NOT NULL,
    subtotal                  REAL NOT NULL,
    peso_kg_snapshot          REAL DEFAULT 0,
    volume_m3_snapshot        REAL DEFAULT 0,
    created_at                TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
  );
  CREATE INDEX IF NOT EXISTS idx_oitems_order ON order_items(order_id);

  /* ── ORDER_STATUS_HISTORY: histórico de mudanças de status ── */
  CREATE TABLE IF NOT EXISTS order_status_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id      INTEGER NOT NULL,
    from_status   TEXT,
    to_status     TEXT NOT NULL,
    changed_by    INTEGER,                       /* user_id do admin */
    notes         TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_osh_order ON order_status_history(order_id);

  /* ── BANNERS: slider promocional na home do catálogo ── */
  CREATE TABLE IF NOT EXISTS banners (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    subtitle      TEXT,
    image_url     TEXT,
    link_url      TEXT,
    background    TEXT,                          /* gradient ou cor sólida */
    position      INTEGER NOT NULL DEFAULT 0,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

/* ── Migrations idempotentes (rodam toda vez, só aplicam se necessário) ── */
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!cols.find(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    console.log(`[db] Migration: ${table}.${column} adicionada`)
  }
}

ensureColumn('products', 'suggested_sale_price', 'REAL')
ensureColumn('users', 'password_changed_at', 'TEXT')            // troca/reset de senha invalida tokens antigos
ensureColumn('products', 'units_per_box', 'INTEGER')           // Ustulimp: venda por caixa (6 un. de 2L, 4 un. de 5L)
ensureColumn('customers', 'allowed_payment_term_ids', 'TEXT')   // JSON array de IDs ou NULL = todos

console.log('[db] Schema OK em', dbPath)

export default db
