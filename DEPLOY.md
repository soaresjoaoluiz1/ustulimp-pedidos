# Deploy — Ustulimp (Portal de Pedidos)

**URL:** `https://ustulimp.com.br/pedidos`  (subpasta; a LP do revendedor fica em `/revendedor/`)
**Hospedagem:** Cajuhosting, cPanel compartilhado (`ustulimp.com.br:2083`), usuário `ustulimpcom`. Sem root, sem PM2.
**Stack:** Node (cPanel → Node.js / Passenger) · Express 4 · better-sqlite3 10 · React + Vite (dist/ commitada)
**Código no servidor:** `/home/ustulimpcom/ustulimp-pedidos`  (FORA da public_html)
**Startup file:** `app.cjs` (wrapper CommonJS → `server/index.js`)
**DB:** `server/data/ustulimp-pedidos.db` (SQLite, fica no servidor, nunca vai pro git)
**BASE_PATH:** `/pedidos`

## Regras duras (as mesmas da LP)

- **NUNCA mexer em e-mail** da Marcela (contas, forwarders, filtros, `~/mail`, `etc/valiases`…).
- Não tocar em nada fora de `~/ustulimp-pedidos` e `public_html/pedidos` (o cPanel cria essa pasta sozinho).
- Não rodar `chown -R` na public_html.
- Acesso Ustulimp só sobe código Ustulimp.

---

## 1ª vez

### 1. Clonar o repositório (cPanel → Git Version Control → Create)
- Clone URL: `https://github.com/soaresjoaoluiz1/ustulimp-pedidos.git`
- Repository Path: `ustulimp-pedidos`  → vira `/home/ustulimpcom/ustulimp-pedidos`
- Repository Name: `ustulimp-pedidos`

### 2. Criar o app Node (cPanel → Node.js → Criar Aplicação)
> Na Cajuhosting (cPanel 136) a ferramenta chama **Node.js**, aba "Aplicativos web", botão "Criar aplicação".
> Os nomes dos campos podem variar um pouco; os valores são estes:
| Campo | Valor |
|---|---|
| Node.js version | a mais alta disponível entre **18, 20 ou 22** |
| Application mode | Production |
| Application root | `ustulimp-pedidos` |
| Application URL | `ustulimp.com.br` / `pedidos` |
| Application startup file | `app.cjs` |

Variáveis de ambiente (botão "Add Variable" na mesma tela):
```
NODE_ENV=production
BASE_PATH=/pedidos
APP_URL=https://ustulimp.com.br/pedidos
JWT_SECRET=<string aleatória longa, 64+ caracteres>
MAIL_FROM=Ustulimp <pedidos@ustulimp.com.br>
ADMIN_NOTIFY_EMAIL=<email que recebe os pedidos>
SMTP_HOST=            # vazio = e-mails só vão pro log
```
> Não precisa de PORT: o Passenger cuida da porta.

### 3. Instalar dependências
Na tela do app: **Run NPM Install**.
O `better-sqlite3` baixa um binário pronto pra versão do Node. Se der erro de build (sem `gcc`),
troque a versão do Node do app pra 20 ou 18 e rode de novo.

### 4. Popular o banco (só na 1ª vez)
Na tela do app, em "Execute script" / "Run JS script": `seed`
(ou pelo Terminal do cPanel, copiando o comando `source …/activate` que aparece no topo da tela do app:
`cd ~/ustulimp-pedidos && npm run seed`)

### 5. Start / Restart
Botão **Restart**. Testar:
- `https://ustulimp.com.br/pedidos/api/health` → `"ok":true` com `"products":29`
- `https://ustulimp.com.br/pedidos` → tela de login
- Login admin: `admin@ustulimp.com.br` / `admin123` → **trocar a senha no 1º acesso**

---

## Updates (rotina)

**Local:**
```bash
cd "Open Squad/ustulimp-pedidos"
npm run build                 # dist/ vai commitada, com base /pedidos/
git add -A && git commit -m "..." && git push origin main
```
**cPanel:** Git Version Control → `ustulimp-pedidos` → Manage → Pull or Deploy → **Update from Remote**,
depois Setup Node.js App → **Restart**.

> Nova dependência npm → também clicar em **Run NPM Install** antes do Restart.
> ⚠️ **Nunca** rodar `npm run seed:reset` em produção depois do go-live (apaga pedidos e clientes).

## Fotos dos produtos
Arquivos em `public/products/` → entram no build → URL `/pedidos/products/<arquivo>`.
O `image_url` de cada produto fica no catálogo (`server/data/products-catalog.js`, por SKU).
Ao iniciar, o server preenche sozinho a foto dos produtos que estão SEM foto no banco
(não sobrescreve upload do admin). Então foto nova = build + push + Update from Remote + Reiniciar.

## Troubleshooting
- **503 / "Incomplete response"** → app caiu. Ver `stderr.log` na pasta do app e o log do Passenger na tela do app.
- **`better-sqlite3` erro** → Run NPM Install de novo; se persistir, trocar a versão do Node e reinstalar.
- **assets 404** → conferir se o `dist/` veio no pull e se o build usou `base:'/pedidos/'`.
- **/pedidos abre a LP ou 404** → Application URL do app errado; tem que ser `pedidos`.
