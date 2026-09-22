/**
 * Mailer — wrapper sobre nodemailer com graceful degradation.
 *
 * Configurar no .env:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_SECURE=false
 *   SMTP_USER=seu@email.com
 *   SMTP_PASS=app-password
 *   MAIL_FROM="Ustulimp <pedidos@ustulimp.com.br>"
 *   ADMIN_NOTIFY_EMAIL=contato@ustulimp.com.br
 *   APP_URL=https://ustulimp.com.br/pedidos
 *
 * Se SMTP_HOST não estiver setado, o mailer só faz console.log
 * (o app continua funcionando normalmente — emails ficam só logados).
 */
import nodemailer from 'nodemailer'

const HOST = process.env.SMTP_HOST
const PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const SECURE = process.env.SMTP_SECURE === 'true'
const USER = process.env.SMTP_USER
const PASS = process.env.SMTP_PASS

const FROM = process.env.MAIL_FROM || 'Ustulimp <noreply@ustulimp.com.br>'

let transporter = null
let configured = false

function getTransporter() {
  if (!HOST) return null
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: SECURE,
    auth: USER && PASS ? { user: USER, pass: PASS } : undefined
  })
  configured = true
  console.log(`[mailer] SMTP configurado: ${HOST}:${PORT} (secure=${SECURE})`)
  return transporter
}

export function isMailerConfigured() {
  getTransporter()
  return configured
}

/**
 * Envia email. Retorna { ok, info, error }.
 * Não throws — se falhar, só loga e segue.
 */
export async function sendMail({ to, subject, html, text }) {
  const t = getTransporter()
  if (!t) {
    console.log(`[mailer:DRY-RUN] To: ${to} · ${subject}`)
    return { ok: false, dryRun: true }
  }
  if (!to) {
    console.warn('[mailer] sendMail chamado sem destinatário')
    return { ok: false, error: 'no-recipient' }
  }
  try {
    const info = await t.sendMail({ from: FROM, to, subject, html, text })
    console.log(`[mailer] sent → ${to} (id ${info.messageId})`)
    return { ok: true, info }
  } catch (err) {
    console.error('[mailer] erro:', err.message)
    return { ok: false, error: err.message }
  }
}
