/**
 * Templates HTML de email. HTML inline-only (compatível com clientes de email).
 */

const APP_URL = process.env.APP_URL || 'https://ustulimp.com.br/pedidos'

const fmtBRL = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtNumber = (v, d = 0) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })

function shell(content, preheader = '') {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#1e293b;">
<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.05);">
      <tr><td style="background:linear-gradient(135deg,#024F83 0%,#0282AF 100%);padding:24px 32px;">
        <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-.02em;">
          USTU<span style="color:#01BFD7;">LIMP</span>
        </div>
        <div style="color:rgba(255,255,255,.6);font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-top:2px;">Produtos de limpeza em geral e químico</div>
      </td></tr>
      ${content}
      <tr><td style="background:#f8fafc;padding:20px 32px;text-align:center;color:#64748b;font-size:12px;">
        <div>Ustulimp · CNPJ 55.300.717/0001-40 · Igaraçu do Tietê/SP</div>
        <div style="margin-top:4px;">© ${new Date().getFullYear()} · Desenvolvido por Dros Agência</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

/**
 * Email pro admin avisando novo pedido.
 */
export function adminNewOrderTemplate({ order, items, customer }) {
  const itemsRows = items.map(it => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
        <div style="font-size:13px;color:#1e293b;font-weight:600;">${escapeHtml(it.product_name_snapshot)}</div>
        <div style="font-size:11px;color:#64748b;">SKU ${escapeHtml(it.product_sku_snapshot || '—')} · ${fmtNumber(it.quantity)} × ${fmtBRL(it.unit_price_snapshot)}</div>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#024F83;">${fmtBRL(it.subtotal)}</td>
    </tr>
  `).join('')

  const orderUrl = `${APP_URL}/admin/orders/${order.id}`

  const content = `
    <tr><td style="padding:32px;">
      <div style="background:#dbeafe;color:#1e40af;display:inline-block;padding:6px 14px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:16px;">
        🛒 Novo pedido
      </div>
      <h1 style="margin:0 0 8px;font-size:24px;color:#024F83;font-weight:800;">${escapeHtml(order.order_number)}</h1>
      <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
        Você recebeu um novo pedido de <strong>${escapeHtml(customer.company_name || customer.name)}</strong>${customer.company_name ? ` (${escapeHtml(customer.name)})` : ''}.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:12px;">Cliente</td>
          <td style="padding:6px 0;color:#024F83;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(customer.company_name || customer.name)}</td>
        </tr>
        ${customer.city ? `<tr>
          <td style="padding:6px 0;color:#64748b;font-size:12px;">Cidade</td>
          <td style="padding:6px 0;color:#024F83;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(customer.city)}/${escapeHtml(customer.state || '')}</td>
        </tr>` : ''}
        ${customer.whatsapp || customer.phone ? `<tr>
          <td style="padding:6px 0;color:#64748b;font-size:12px;">WhatsApp</td>
          <td style="padding:6px 0;color:#024F83;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(customer.whatsapp || customer.phone)}</td>
        </tr>` : ''}
        ${order.payment_term ? `<tr>
          <td style="padding:6px 0;color:#64748b;font-size:12px;">Prazo de pagamento</td>
          <td style="padding:6px 0;color:#024F83;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(order.payment_term)}${order.payment_method ? ` · ${escapeHtml(order.payment_method)}` : ''}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:12px;">Transporte</td>
          <td style="padding:6px 0;color:#024F83;font-size:13px;font-weight:600;text-align:right;">${fmtNumber(order.peso_total_kg, 2)} kg · ${fmtNumber(order.volume_total_m3, 4)} m³</td>
        </tr>
      </table>

      <h3 style="margin:0 0 12px;font-size:14px;color:#024F83;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Itens (${items.length})</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        ${itemsRows}
        <tr>
          <td style="padding:14px 0 0;font-size:14px;color:#64748b;">Total</td>
          <td style="padding:14px 0 0;font-size:22px;color:#024F83;font-weight:800;text-align:right;">${fmtBRL(order.total_value)}</td>
        </tr>
      </table>

      ${order.notes ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:6px;margin-bottom:20px;">
        <div style="font-size:11px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Observações do cliente</div>
        <div style="font-size:13px;color:#78350f;line-height:1.5;">${escapeHtml(order.notes)}</div>
      </div>` : ''}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
        <tr><td align="center">
          <a href="${orderUrl}" style="display:inline-block;background:#024F83;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:700;">
            Abrir pedido no painel →
          </a>
        </td></tr>
      </table>
    </td></tr>
  `

  return {
    subject: `🛒 Novo pedido ${order.order_number} · ${customer.company_name || customer.name} · ${fmtBRL(order.total_value)}`,
    html: shell(content, `Novo pedido de ${customer.company_name || customer.name} no valor de ${fmtBRL(order.total_value)}`),
    text: `Novo pedido ${order.order_number} de ${customer.company_name || customer.name}. Total: ${fmtBRL(order.total_value)}. Abra: ${orderUrl}`
  }
}

/**
 * Email pro cliente confirmando que recebemos.
 */
export function customerOrderConfirmedTemplate({ order, items, customer }) {
  const itemsRows = items.slice(0, 8).map(it => `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#1e293b;">${escapeHtml(it.product_name_snapshot)}</td>
      <td style="padding:6px 0;font-size:13px;color:#64748b;text-align:center;">${fmtNumber(it.quantity)}</td>
      <td style="padding:6px 0;font-size:13px;color:#024F83;font-weight:700;text-align:right;">${fmtBRL(it.subtotal)}</td>
    </tr>
  `).join('')

  const moreItems = items.length > 8 ? `<tr><td colspan="3" style="padding:8px 0;font-size:12px;color:#64748b;font-style:italic;">+ ${items.length - 8} outros itens</td></tr>` : ''

  const orderUrl = `${APP_URL}/app/orders/${order.id}`

  const content = `
    <tr><td style="padding:32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:64px;height:64px;border-radius:50%;background:#d1fae5;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;">
          <span style="font-size:30px;">✓</span>
        </div>
        <h1 style="margin:0;font-size:22px;color:#024F83;font-weight:800;">Pedido recebido!</h1>
        <p style="margin:8px 0 0;color:#475569;font-size:14px;">Olá ${escapeHtml(customer.name)}, recebemos seu pedido <strong>${escapeHtml(order.order_number)}</strong>.</p>
      </div>

      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 14px;font-size:14px;color:#475569;line-height:1.6;">
          Um consultor da Ustulimp vai entrar em contato em breve em horário comercial pra confirmar a entrega e instruções de pagamento.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${itemsRows}${moreItems}
          <tr>
            <td colspan="2" style="padding:12px 0 0;font-size:14px;color:#64748b;border-top:2px solid #e2e8f0;">Total</td>
            <td style="padding:12px 0 0;font-size:18px;color:#024F83;font-weight:800;text-align:right;border-top:2px solid #e2e8f0;">${fmtBRL(order.total_value)}</td>
          </tr>
        </table>
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center">
          <a href="${orderUrl}" style="display:inline-block;background:#024F83;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;">
            Ver pedido completo →
          </a>
        </td></tr>
      </table>
    </td></tr>
  `

  return {
    subject: `Pedido ${order.order_number} recebido · Ustulimp`,
    html: shell(content, `Recebemos seu pedido ${order.order_number} no valor de ${fmtBRL(order.total_value)}`),
    text: `Olá ${customer.name}, recebemos seu pedido ${order.order_number}. Total: ${fmtBRL(order.total_value)}. Veja: ${orderUrl}`
  }
}

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
