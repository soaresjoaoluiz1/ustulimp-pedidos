import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Phone, Package, Clock, FileDown, Save, Printer } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, Badge, Button, Select, Textarea, toast } from '@/components/ui'
import { PageHeader } from '@/components/admin/AdminLayout'
import { fmtBRL, fmtNumber, fmtDateTime, STATUS_LABEL, STATUS_COLOR } from '@/lib/format'

interface OrderDetail {
  order: any
  items: any[]
  history: any[]
}

const ALLOWED_STATUSES = ['novo','em_analise','confirmado','separado','entregue','cancelado']

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const d = await api.get<OrderDetail>(`/admin/orders/${id}`)
      setData(d)
      setAdminNotes(d.order.admin_notes || '')
      setNewStatus(d.order.status)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  async function changeStatus() {
    if (!data || newStatus === data.order.status) return
    setSavingStatus(true)
    try {
      await api.patch(`/admin/orders/${id}/status`, { status: newStatus, notes: statusNotes || null })
      toast.success('Status atualizado')
      setStatusNotes('')
      load()
    } catch (err: any) { toast.error(err.message) }
    finally { setSavingStatus(false) }
  }

  async function saveAdminNotes() {
    setSavingNotes(true)
    try {
      await api.put(`/admin/orders/${id}/admin-notes`, { admin_notes: adminNotes })
      toast.success('Observações salvas')
    } catch (err: any) { toast.error(err.message) }
    finally { setSavingNotes(false) }
  }

  if (loading || !data) return <div className="text-sm text-slate-500">Carregando…</div>
  const { order, items, history } = data

  const whatsappLink = order.whatsapp || order.phone
    ? `https://wa.me/55${(order.whatsapp || order.phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${order.customer_name}! Sobre seu pedido ${order.order_number}…`)}`
    : null

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders')}>
          <ArrowLeft className="w-4 h-4" /> Pedidos
        </Button>
      </div>

      <PageHeader
        title={`Pedido ${order.order_number}`}
        subtitle={fmtDateTime(order.created_at)}
        action={
          <div className="flex gap-2">
            <Link to={`/admin/orders/${id}/print`}>
              <Button variant="secondary"><Printer className="w-4 h-4" />Imprimir / PDF</Button>
            </Link>
            {whatsappLink && (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <Button variant="success"><MessageSquare className="w-4 h-4" />WhatsApp</Button>
              </a>
            )}
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Itens */}
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-display font-bold text-navy-800">{items.length} itens</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((it: any) => (
                <div key={it.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-navy-800 truncate">{it.product_name_snapshot}</div>
                    <div className="text-xs text-slate-500">SKU {it.product_sku_snapshot || '—'}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm">{fmtNumber(it.quantity)} × {fmtBRL(it.unit_price_snapshot)}</div>
                    <div className="font-display font-bold text-navy-800">{fmtBRL(it.subtotal)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t-2 border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Total · Peso {fmtNumber(order.peso_total_kg, 2)}kg · Volume {fmtNumber(order.volume_total_m3, 4)}m³</div>
              </div>
              <div className="font-display text-2xl font-extrabold text-navy-800">{fmtBRL(order.total_value)}</div>
            </div>
          </Card>

          {/* Observações do cliente */}
          {order.notes && (
            <Card className="p-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Observações do cliente</div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.notes}</p>
            </Card>
          )}

          {/* Observações internas */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Observações internas (admin)</div>
              <Button variant="ghost" size="sm" onClick={saveAdminNotes} loading={savingNotes}><Save className="w-3 h-3" />Salvar</Button>
            </div>
            <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} placeholder="Anotações internas, info de entrega, conversa com cliente..." />
          </Card>

          {/* Histórico */}
          <Card className="p-5">
            <h2 className="font-display font-bold text-navy-800 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />Histórico de status
            </h2>
            <div className="space-y-2">
              {history.map((h: any) => (
                <div key={h.id} className="flex items-start gap-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-navy-500 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      {h.from_status ? (
                        <><Badge className={STATUS_COLOR[h.from_status]}>{STATUS_LABEL[h.from_status]}</Badge>
                          <span className="mx-2 text-slate-400">→</span>
                          <Badge className={STATUS_COLOR[h.to_status]}>{STATUS_LABEL[h.to_status]}</Badge></>
                      ) : (
                        <Badge className={STATUS_COLOR[h.to_status]}>{STATUS_LABEL[h.to_status]}</Badge>
                      )}
                    </div>
                    {h.notes && <div className="text-xs text-slate-600 mt-1">{h.notes}</div>}
                    <div className="text-xs text-slate-400 mt-0.5">{h.changed_by_name || 'Sistema'} · {fmtDateTime(h.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar direita */}
        <div className="space-y-4">
          {/* Status atual + mudança */}
          <Card className="p-5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status atual</div>
            <Badge className={`${STATUS_COLOR[order.status]} text-base px-3 py-1.5`}>{STATUS_LABEL[order.status]}</Badge>

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <Select label="Mudar pra" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                {ALLOWED_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </Select>
              <Textarea label="Nota (opcional)" value={statusNotes} onChange={e => setStatusNotes(e.target.value)} rows={2} placeholder="Ex: Estoque verificado, agendar entrega" />
              <Button onClick={changeStatus} loading={savingStatus} disabled={newStatus === order.status} className="w-full">
                Atualizar status
              </Button>
            </div>
          </Card>

          {/* Cliente */}
          <Card className="p-5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cliente</div>
            <Link to={`/admin/customers`} className="font-display font-bold text-navy-800 hover:text-brand-blue">
              {order.company_name || order.customer_name}
            </Link>
            {order.company_name && <div className="text-sm text-slate-600">{order.customer_name}</div>}
            <div className="text-xs text-slate-500 space-y-1 mt-2">
              {order.city && <div>📍 {order.city}/{order.state}</div>}
              {order.phone && <div>📞 {order.phone}</div>}
              {order.whatsapp && order.whatsapp !== order.phone && <div>💬 {order.whatsapp}</div>}
              {order.document && <div>{order.document_type?.toUpperCase()} {order.document}</div>}
            </div>
          </Card>

          {/* Pagamento */}
          <Card className="p-5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pagamento</div>
            <div className="text-sm">
              <div className="font-semibold text-navy-800">{order.payment_term || 'Não definido'}</div>
              <div className="text-slate-600">{order.payment_method || '—'}</div>
              <div className="text-xs text-slate-500 mt-1">Tabela: {order.price_table_name}</div>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
