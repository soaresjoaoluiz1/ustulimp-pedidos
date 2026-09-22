# Ustulimp — Plataforma de Pedidos B2B

> 🏭 **Plataforma de pedidos online para a rede de revendedores Ustulimp.**
> Catálogo digital com tabelas de preço por cliente, painel administrativo completo e checkout offline (sem pagamento online — pedido é processado pelo time comercial).
>
> 🌐 **Produção:** `ustulimp.com.br/pedidos`
> 🛠 **Stack:** Node.js 18 · Express · SQLite · React · TypeScript · Vite · Tailwind

---

## 🎯 O que essa plataforma resolve

A Oxiquímica trabalha com dezenas de revendedores espalhados por Minas Gerais, cada um pagando preços diferentes (tabela próxima, interior, atacado…). Antes:

- Pedidos eram fechados por WhatsApp / planilha
- Cada vendedor lembrava (ou esquecia) qual tabela aplicar pra cada cliente
- Sem histórico centralizado de pedidos
- Sem controle de status (separado, entregue, cancelado…)
- Sem snapshot de preço — se o preço mudasse, pedido antigo bagunçava
- Cliente não tinha autonomia pra montar seu próprio pedido

Agora: **revendedor loga, vê só os produtos da SUA tabela com SEU preço, monta o carrinho e envia. Admin recebe, dá sequência manualmente.**

---

## 🏗️ Arquitetura

```
                    Cliente revendedor                 Admin Oxiquímica
                          ↓                                    ↓
              ┌──────────────────────┐         ┌──────────────────────┐
              │  Catálogo (Mercos-   │         │  Painel admin        │
              │  like): sidebar de   │         │  (sidebar + tabelas) │
              │  categorias, busca,  │         │                      │
              │  cards com preço,    │         │  - Dashboard KPIs    │
              │  qty inline,         │         │  - Pedidos (status)  │
              │  carrinho lateral    │         │  - Produtos (CRUD)   │
              │                      │         │  - Categorias        │
              └──────────┬───────────┘         │  - Tabelas de preço  │
                         │                     │  - Bulk price editor │
                  POST /api/orders             │  - Clientes (+ senha │
                         │                     │    temporária)       │
                         ↓                     │  - Settings          │
              ┌──────────────────────┐         └──────────┬───────────┘
              │  Express API + JWT   │                    │
              │  10 tabelas SQLite   │←───────────────────┘
              │  Auth: admin/cliente │
              │  Snapshot de preços  │
              └──────────┬───────────┘
                         │
                   ┌─────┴─────┬──────────┐
                   ↓           ↓          ↓
              Email admin  Email      Export CSV
              (novo pedido)cliente    (com itens)
                          (confirma)

                   PDF do pedido (cliente + admin) via window.print
```

---

## ✨ Funcionalidades implementadas

### 👤 Catálogo do cliente (`/app`)

Inspirado no padrão Mercos (a referência B2B brasileira):

- **Header sticky** com logo, busca global, contador de carrinho com valor em tempo real, avatar com menu (meus pedidos, sair)
- **Hero personalizado** com nome da empresa do cliente + tabela de preço vinculada
- **Sidebar lateral** com categorias e contagem de produtos
- **Grid responsivo** de produtos (4 cols desktop / 2 mobile) com:
  - Imagem com gradient azul Oxi quando não tem foto
  - Badge de % de economia automático (compara com preço de mercado)
  - Badge de qty no carrinho
  - Preço grande emerald
  - Input de quantidade inline + botão `COMPRAR`
  - Quando já no carrinho, vira controle `+/-`
- **Modal de detalhe** ao clicar no card (descrição completa + tags + comparação preço seu × mercado)
- **Carrinho lateral (slide-over)** com totais, peso bruto, volume e botão de finalizar
- **Persistência via `localStorage`** — fecha o navegador, reabre, carrinho continua

### 🛒 Checkout em 3 etapas

Stepper estilo Mercos: `Carrinho → Pagamento → Confirmar`.

1. **Carrinho:** revisar/ajustar quantidades
2. **Pagamento:** prazo (configurável: à vista, 20, 30, 20/30/40, 30/45/60, 30/60/90 dias) + forma (boleto/PIX/dinheiro) + observações
3. **Confirmar:** dispara `POST /api/orders` → cria pedido com **snapshot de preços, nome, peso e volume** (mesmo se admin mudar preço depois, pedido antigo fica intacto)

Sem pagamento online — banner explica que um consultor entra em contato pra alinhar.

### 📦 Painel admin (`/admin`)

#### Dashboard
- 4 KPIs principais (pedidos, faturamento, pendentes, clientes)
- Top 5 produtos por receita
- Top 5 clientes por gasto
- Pedidos recentes com status colorido

#### Pedidos
- Lista filtrada por status (chips coloridos: Novo, Em análise, Confirmado, Separado, Entregue, Cancelado)
- Busca por número, cliente ou empresa
- **Detalhe completo** com:
  - Lista de itens (snapshot)
  - Cliente + WhatsApp direto
  - Mudança de status com nota interna (registra em `order_status_history`)
  - Observações internas (admin) separadas das do cliente
  - Histórico de mudanças com timestamp e quem mudou
- **Export CSV** (com BOM UTF-8 e vírgula brasileira pra Excel) — versão resumida ou com itens detalhados
- **Print/PDF** layout A4 profissional (zero dependência — usa `window.print()`)

#### Produtos
- Tabela com search + filtro por categoria
- Modal CRUD completo: SKU, nome, uso curto, descrição, categoria, unidade, preço de mercado, peso, volume, tags, destaque, ativo
- Soft delete (preserva pedidos antigos)

#### Categorias
- CRUD com posição (ordem no catálogo) e emoji como ícone
- Bloqueia delete se houver produtos vinculados

#### **Editor de Tabelas de Preço (★ tela mais importante)**
- Mostra TODOS os produtos com input de preço inline + checkbox "ativo"
- Linhas modificadas viram amarelas (visual de "dirty")
- Filtros: search, categoria, "só sem preço"
- **Aplicar em massa** com 4 modos:
  - Preço fixo
  - Multiplicador sobre preço atual (ex: 1.10 = +10%)
  - Percentual do preço de mercado (ex: 50 = 50%)
  - Desconto sobre preço de mercado
- Salva em batch via UPSERT
- Produto sem linha na tabela = produto não aparece pro cliente

#### Clientes
- Lista com pedidos, total gasto, último login, tabela vinculada
- Form completo: dados PF/PJ, endereço, distância em km, tabela de preço, pedido mínimo customizado, observações internas
- Auto-gera senha temporária OU permite definir
- **Modal de credenciais** após criar cliente:
  - Mostra email + senha
  - Botão "Copiar mensagem completa" pronta pra WhatsApp:
    > Olá! Você foi cadastrado como revendedor da Oxiquímica.
    > 📧 Email: ...
    > 🔑 Senha: ...
- Botão "Resetar senha" (gera nova e mostra modal de credenciais)

#### Configurações
- CRUD de prazos de pagamento
- Trocar senha do admin

### 📧 Notificações por email

- **Novo pedido → admin recebe email** com card do cliente, lista de itens, total, observações e botão "Abrir no painel"
- **Cliente recebe email** confirmando que pedido foi recebido
- **Templates HTML responsivos** com header gradient navy→cyan
- **Graceful degradation:** se `SMTP_HOST` não configurado, faz só `console.log` (DRY-RUN). App segue normal.
- Compatível com qualquer SMTP — Gmail, Resend, SendGrid, Mailgun, Postfix próprio

---

## 🗄️ Modelagem de dados

11 tabelas SQLite com FKs e índices:

```
users (admin + cliente, com senha bcrypt)
  └─ customers (1:1 com user role=cliente)
       └─ price_table_id → price_tables
       └─ orders
            └─ order_items (com SNAPSHOT de nome/preço/peso/volume)
            └─ order_status_history (auditoria)

categories
  └─ products
       └─ price_table_items (preço por tabela)

price_tables
  └─ price_table_items
  └─ customers (vínculo)
  └─ orders (snapshot)

payment_terms (prazos configuráveis)
banners (slider promocional — futuro)
```

**Por que SQLite?** Single-file, zero infra, performance excelente pra B2B (centenas de pedidos/dia ainda é nada pra SQLite). Backup é só copiar 1 arquivo. Sem servidor de DB pra cuidar.

---

## 🛠️ Stack

| Camada | Tecnologia | Por quê |
|---|---|---|
| Frontend | **React 19 + TypeScript** | Tipagem forte, ecosystem maduro |
| Build | **Vite 4** | Hot reload instantâneo, build leve (~370 KB final) |
| Estilo | **Tailwind 3** + design system custom | Tokens (cores Oxi, fontes) + utility-first |
| Componentes | **shadcn-style inline** + Lucide icons | Sem dep pesada, total controle |
| Roteamento | **React Router 7** | Padrão de mercado |
| Estado global | **React Context** (auth + cart) | Sem Redux, suficiente pro escopo |
| Backend | **Node 18 + Express 4** | Battle-tested, pequeno footprint |
| Banco | **better-sqlite3 12** (síncrono) | Zero overhead, transações nativas |
| Auth | **JWT** (jsonwebtoken) + bcryptjs | Sem sessão server-side, escalável |
| Email | **nodemailer** | Funciona com qualquer SMTP |
| Process manager | **PM2** | Auto-restart, logs, startup |
| Web server | **Apache 2.4** (cPanel) | Reverse proxy + SSL Let's Encrypt |

---

## 📁 Estrutura

```
oxi-pedidos/
├── server/
│   ├── index.js              # Express bootstrap + healthcheck + mount routes
│   ├── db.js                 # Schema SQLite (11 tabelas)
│   ├── seed.js               # Importer one-shot do catálogo (87 produtos)
│   ├── data/
│   │   └── products-catalog.js  # Dataset extraído do catálogo digital
│   ├── lib/
│   │   ├── mailer.js         # Wrapper nodemailer com graceful degradation
│   │   └── email-templates.js   # Templates HTML responsivos
│   ├── middleware/
│   │   └── auth.js           # requireAuth, requireAdmin, requireCustomer
│   └── routes/
│       ├── auth.js           # login, me, change-password
│       ├── catalog.js        # produtos da tabela do cliente
│       ├── orders.js         # criar pedido + histórico do cliente
│       └── admin/
│           ├── dashboard.js
│           ├── products.js
│           ├── categories.js
│           ├── price-tables.js  # inclui bulk update de preços
│           ├── customers.js     # com geração de senha temporária
│           ├── orders.js        # lista, detalhe, status, export.csv
│           └── payment-terms.js
├── src/
│   ├── lib/
│   │   ├── api.ts            # fetch wrapper com JWT auto-injetado
│   │   ├── format.ts         # fmtBRL, fmtDate, status labels
│   │   └── cn.ts             # clsx helper
│   ├── context/
│   │   ├── AuthContext.tsx   # login, logout, refresh
│   │   └── CartContext.tsx   # carrinho + localStorage
│   ├── components/
│   │   ├── ui/index.tsx      # Button, Input, Select, Modal, Toast, EmptyState
│   │   ├── admin/AdminLayout.tsx
│   │   └── customer/
│   │       ├── CustomerLayout.tsx
│   │       ├── ProductCard.tsx
│   │       └── CartSidebar.tsx
│   └── pages/
│       ├── Login.tsx
│       ├── OrderPrint.tsx    # view A4 pra PDF
│       ├── admin/            # 8 páginas do painel
│       └── app/              # 4 páginas do cliente
├── ecosystem.config.cjs      # PM2 config (process dros-oxi-pedidos:3005)
├── scripts/backup.sh         # Backup diário SQLite via cron
└── DEPLOY.md                 # Documentação completa de produção
```

---

## 🚀 Como rodar local

```bash
# 1. Instala deps
npm install

# 2. Popula banco com catálogo Oxi (admin + 87 produtos + 3 tabelas)
npm run seed

# 3. Sobe backend (3005) + frontend (5173) juntos
npm run dev
```

Abre `http://localhost:5173`.

**Credenciais admin (após o seed):**
```
Email:  admin@oxiquimicavarginha.com.br
Senha:  admin123    ⚠ TROCAR no primeiro login
```

---

## 🌍 Deploy

Estratégia: build local, dist commitada, VPS só puxa e dá restart. **Sem build na VPS = zero risco de quebrar por versão de Node.**

```bash
# Local
npm run build
git add -A && git commit -m "feat: ..." && git push

# VPS
cd /root/oxi-pedidos
git pull
pm2 restart dros-oxi-pedidos
```

Documentação completa em **[DEPLOY.md](./DEPLOY.md)** com:
- Configuração de Node 18 via nvm (sem afetar outros sistemas em Node 16)
- Apache reverse proxy
- SSL Let's Encrypt
- Variáveis de ambiente (.env)
- Backup automatizado
- Troubleshooting

---

## 🔐 Segurança

- Senhas com **bcrypt** (10 rounds)
- JWT com expiração de 7 dias
- Middleware separa rotas públicas, autenticadas, de admin e de cliente
- `requireCustomer` injeta automaticamente o `customer` na request, **garantindo isolamento de dados** (cliente nunca vê pedido de outro)
- SQL via **prepared statements** (zero risco de injection)
- Foreign keys e CHECK constraints no banco (status válido, role válida, etc)

---

## 📊 Snapshot de preços (decisão chave)

Toda vez que um pedido é criado, os campos abaixo são **congelados** em `order_items`:

- `product_name_snapshot`
- `product_sku_snapshot`
- `unit_price_snapshot`
- `peso_kg_snapshot`
- `volume_m3_snapshot`

Mesmo que o admin mude o preço de um produto, ou que a tabela seja reconfigurada, ou que o produto seja deletado/desativado depois — o pedido antigo permanece **idêntico ao momento em que foi feito**. Histórico financeiro confiável.

---

## 🎨 Identidade visual

Alinhada com a Oxiquímica e a LP de revendedor (`revendedor.oxiquimicavarginha.com.br`):

- **Cores principais:** navy `#0f1f4b` · brand-blue `#2563eb` · brand-cyan `#00B0FF` · success `#059669`
- **Tipografia:** Inter (geral) + Sora (display, headings)
- **Mobile-first:** sidebar vira drawer no mobile, header sticky com hambúrguer
- **Acessibilidade:** ARIA roles, foco visível, touch targets ≥ 48px

---

## 🛣️ Roadmap (próximas iterações)

- [ ] Upload de imagem real dos produtos (multer + storage local ou S3)
- [ ] Banner promocional configurável (tabela `banners` já modelada)
- [ ] Modo "catálogo público sem preços" (rota `/app/preview` sem auth)
- [ ] App mobile (PWA com `manifest.json`)
- [ ] Conexão com ERP / NF-e quando a Oxiquímica decidir
- [ ] Cupons de desconto
- [ ] Notificação por WhatsApp (Evolution API) opcional
