import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ShoppingCart, FileDown } from 'lucide-react'
import { api, getToken } from '@/lib/api'
import { Card, Badge, Button, EmptyState, toast } from '@/components/ui'
import { PageHeader } from '@/components/admin/AdminLayout'
import { fmtBRL, fmtRelative, STATUS_LABEL, STATUS_COLOR, fmtDateTime } from '@/lib/format'

interface Order {
  id: number
  order_number: string
  customer_id: number
  customer_name: string
  company_name?: string
  city?: string
  state?: string
  status: string
  total_value: number
  items_count: number
  payment_term?: string
  payment_method?: string
  price_table_name?: string
  created_at: string
}

const STATUSES: Array<{ value: string; label: string; color: string }> = [
  { value: '',           label: 'Todos',      color: 'bg-slate-100 text-slate-700' },
  { value: 'novo',       label: 'Novos',      color: 'bg-blue-100 text-blue-700' },
  { value: 'em_analise', label: 'Em análise', color: 'bg-amber-100 text-amber-700' },
  { value: 'confirmado', label: 'Confirmado', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'separado',   label: 'Separado',   color: 'bg-violet-100 text-violet-700' },
  { value: 'entregue',   label: 'Entregue',   color: 'bg-green-100 text-green-700' },
  { value: 'cancelado',  label: 'Cancelado',  color: 'bg-red-100 text-red-700' }
]

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (search) params.set('search', search)
      const data = await api.get<{ orders: Order[] }>(`/admin/orders${params.toString() ? '?' + params : ''}`)
      setOrders(data.orders)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search, status])

  async function exportCsv(includeItems: boolean) {
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (includeItems) params.set('include_items', '1')
      const url = `/api/admin/orders/export.csv${params.toString() ? '?' + params : ''}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (!res.ok) throw new Error('Falha no export')
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `pedidos-oxi-${new Date().toISOString().slice(0,10)}.csv`
      link.click()
      toast.success('CSV gerado')
    } catch (err: any) {
      toast.error(err.message || 'Erro no export')
    }
  }

  return (
    <>
      <PageHeader
        title="Pedidos"
        subtitle={`${orders.length} pedido${orders.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => exportCsv(false)}>
              <FileDown className="w-4 h-4" /> CSV
            </Button>
            <Button variant="secondary" onClick={() => exportCsv(true)}>
              <FileDown className="w-4 h-4" /> CSV + itens
            </Button>
          </div>
        }
      />

      <Card className="p-3 mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por número, cliente ou empresa…"
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-navy-500 focus:bg-white"
          />
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setStatus(s.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${status === s.value ? 'bg-navy-800 text-white' : `${s.color} hover:bg-opacity-80`}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : orders.length === 0 ? (
        <Card>
          <EmptyState icon={<ShoppingCart className="w-7 h-7" />} title="Nenhum pedido" description="Os pedidos dos seus clientes vão aparecer aqui." />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Pedido</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-center px-4 py-3 hidden md:table-cell">Status</th>
                  <th className="text-right px-4 py-3 hidden sm:table-cell">Itens</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3 hidden lg:table-cell">Criado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-3">
                      <Link to={`/admin/orders/${o.id}`} className="font-display font-bold text-navy-800 hover:text-brand-blue">
                        {o.order_number}
                      </Link>
                      {o.payment_term && <div className="text-xs text-slate-500">{o.payment_term}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/orders/${o.id}`} className="block">
                        <div className="font-semibold text-navy-800">{o.company_name || o.customer_name}</div>
                        <div className="text-xs text-slate-500">
                          {o.company_name && `${o.customer_name} · `}{o.city ? `${o.city}/${o.state}` : '—'}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-center">
                      <Badge className={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-right text-slate-600">{o.items_count}</td>
                    <td className="px-4 py-3 text-right font-display font-bold text-navy-800">{fmtBRL(o.total_value)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-right text-xs text-slate-500" title={fmtDateTime(o.created_at)}>{fmtRelative(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}
