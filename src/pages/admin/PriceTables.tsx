import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Layers, Edit3, Link2, Copy, RefreshCw, EyeOff, Eye } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, Button, Input, Modal, Badge, EmptyState, toast, Textarea } from '@/components/ui'
import { PageHeader } from '@/components/admin/AdminLayout'
import { fmtBRL } from '@/lib/format'

interface PriceTable {
  id: number
  name: string
  slug: string
  description?: string
  distance_min_km?: number
  distance_max_km?: number
  minimum_order_value: number
  is_active: number
  items_count: number
  customers_count: number
  public_token?: string | null
  public_enabled?: number
  public_orders_count?: number
  show_suggested_sale?: number
}

export default function PriceTables() {
  const [tables, setTables] = useState<PriceTable[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<PriceTable | 'new' | null>(null)
  const navigate = useNavigate()

  async function load() {
    setLoading(true)
    try {
      const data = await api.get<{ price_tables: PriceTable[] }>('/admin/price-tables')
      setTables(data.price_tables)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function handleDelete(t: PriceTable) {
    if (t.customers_count > 0) {
      toast.error(`${t.customers_count} clientes vinculados. Desvincule antes.`)
      return
    }
    if (!confirm(`Deletar tabela "${t.name}"?`)) return
    try {
      await api.delete(`/admin/price-tables/${t.id}`)
      toast.success('Tabela deletada')
      load()
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <>
      <PageHeader
        title="Tabelas de preço"
        subtitle={`${tables.length} tabela${tables.length !== 1 ? 's' : ''}`}
        action={<Button onClick={() => setEditing('new')}><Plus className="w-4 h-4" />Nova tabela</Button>}
      />

      {loading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : tables.length === 0 ? (
        <Card>
          <EmptyState icon={<Layers className="w-7 h-7" />} title="Nenhuma tabela de preço" action={<Button onClick={() => setEditing('new')}>Criar tabela</Button>} />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map(t => (
            <Card key={t.id} className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-bold text-navy-800">{t.name}</h3>
                    {!t.is_active && <Badge className="bg-slate-100 text-slate-500">Inativa</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">/{t.slug}</div>
                </div>
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(t)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t)} className="text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>

              {t.description && <p className="text-sm text-slate-500 mb-3">{t.description}</p>}

              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-500">Produtos</div>
                  <div className="font-bold text-navy-800 text-base">{t.items_count}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <div className="text-slate-500">Clientes</div>
                  <div className="font-bold text-navy-800 text-base">{t.customers_count}</div>
                </div>
              </div>

              {t.minimum_order_value > 0 && (
                <div className="text-xs text-slate-500 mb-3">
                  Pedido mínimo: <span className="font-semibold text-navy-800">{fmtBRL(t.minimum_order_value)}</span>
                </div>
              )}

              <Button variant="secondary" className="w-full" onClick={() => navigate(`/admin/price-tables/${t.id}/items`)}>
                <Edit3 className="w-4 h-4" /> Editar preços
              </Button>

              <PublicLink table={t} onChanged={load} />
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <PriceTableModal
          table={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </>
  )
}

function PriceTableModal({ table, onClose, onSaved }: { table: PriceTable | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: table?.name || '',
    description: table?.description || '',
    distance_min_km: table?.distance_min_km?.toString() || '',
    distance_max_km: table?.distance_max_km?.toString() || '',
    minimum_order_value: table?.minimum_order_value?.toString() || '0',
    show_suggested_sale: !!(table as any)?.show_suggested_sale
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        distance_min_km: form.distance_min_km ? Number(form.distance_min_km) : null,
        distance_max_km: form.distance_max_km ? Number(form.distance_max_km) : null,
        minimum_order_value: Number(form.minimum_order_value) || 0,
        show_suggested_sale: form.show_suggested_sale
      }
      if (table) {
        await api.put(`/admin/price-tables/${table.id}`, payload)
      } else {
        await api.post('/admin/price-tables', payload)
      }
      toast.success(`Tabela ${table ? 'atualizada' : 'criada'}`)
      onSaved()
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={table ? 'Editar tabela' : 'Nova tabela de preço'}>
      <div className="space-y-4">
        <Input label="Nome *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Tabela Próxima" />
        <Textarea label="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Sul de MG, frete grátis em rotas" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Distância mín. (km)" type="number" value={form.distance_min_km} onChange={e => setForm({ ...form, distance_min_km: e.target.value })} placeholder="0" />
          <Input label="Distância máx. (km)" type="number" value={form.distance_max_km} onChange={e => setForm({ ...form, distance_max_km: e.target.value })} placeholder="100" />
        </div>
        <Input label="Pedido mínimo (R$)" type="number" step="0.01" value={form.minimum_order_value} onChange={e => setForm({ ...form, minimum_order_value: e.target.value })} hint="0 = sem mínimo" />
        <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={form.show_suggested_sale} onChange={e => setForm({ ...form, show_suggested_sale: e.target.checked })} className="mt-0.5" />
          <span>
            Mostrar sugestão de revenda no catálogo
            <span className="block text-xs text-slate-500">Marque só em tabela de revendedor. O cliente final não deve ver "revende por".</span>
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>{table ? 'Salvar' : 'Criar'}</Button>
        </div>
      </div>
    </Modal>
  )
}

/** Link aberto do catálogo: gerar, copiar, pausar e trocar. */
function PublicLink({ table, onChanged }: { table: PriceTable; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState<string | null>(
    table.public_token ? `${window.location.origin}${import.meta.env.BASE_URL}c/${table.public_token}` : null
  )
  const ativo = !!table.public_token && table.public_enabled === 1

  async function acao(fn: () => Promise<any>, msg: string) {
    setBusy(true)
    try { const r = await fn(); if (r?.url) setUrl(`${window.location.origin}${import.meta.env.BASE_URL}c/${r.token}`); toast.success(msg); onChanged() }
    catch (err: any) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  function copiar(texto: string, msg: string) {
    navigator.clipboard.writeText(texto)
    toast.success(msg)
  }

  if (!table.public_token) {
    return (
      <div className="mt-3 pt-3 border-t border-slate-100">
        <Button variant="ghost" size="sm" className="w-full text-navy-700" loading={busy}
          onClick={() => acao(() => api.post(`/admin/price-tables/${table.id}/public-link`), 'Link gerado')}>
          <Link2 className="w-4 h-4" /> Gerar link público
        </Button>
        <p className="text-[11px] text-slate-400 mt-1 text-center">
          Quem tiver o link vê os preços desta tabela{table.show_suggested_sale ? ', inclusive a revenda sugerida' : ''}.
        </p>
      </div>
    )
  }

  const msgWhats = `Olá! Segue o catálogo da ${'Ustulimp'} com os seus preços. É só montar o pedido pelo link: ${url}`

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Link público</span>
        <Badge className={ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
          {ativo ? 'Ativo' : 'Pausado'}
        </Badge>
      </div>

      <div className="flex gap-1">
        <input readOnly value={url || ''} onFocus={e => e.currentTarget.select()}
          className="flex-1 min-w-0 px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-600" />
        <Button variant="ghost" size="sm" onClick={() => copiar(url || '', 'Link copiado')} title="Copiar link">
          <Copy className="w-4 h-4" />
        </Button>
      </div>

      <Button variant="secondary" size="sm" className="w-full"
        onClick={() => copiar(msgWhats, 'Mensagem copiada — é só colar no WhatsApp')}>
        Copiar mensagem pro WhatsApp
      </Button>

      <div className="flex gap-1">
        <Button variant="ghost" size="sm" className="flex-1" loading={busy}
          onClick={() => acao(() => api.patch(`/admin/price-tables/${table.id}/public-link`, { enabled: !ativo }), ativo ? 'Link pausado' : 'Link reativado')}>
          {ativo ? <><EyeOff className="w-4 h-4" /> Pausar</> : <><Eye className="w-4 h-4" /> Reativar</>}
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 text-red-500 hover:bg-red-50" loading={busy}
          onClick={() => {
            if (!confirm('Gerar um link novo invalida o atual. Quem já recebeu o link antigo não vai mais conseguir abrir. Continuar?')) return
            acao(() => api.post(`/admin/price-tables/${table.id}/public-link`), 'Link novo gerado')
          }}>
          <RefreshCw className="w-4 h-4" /> Trocar
        </Button>
      </div>

      {(table.public_orders_count || 0) > 0 && (
        <p className="text-[11px] text-slate-500 text-center">
          {table.public_orders_count} pedido(s) vieram deste link
        </p>
      )}
    </div>
  )
}
