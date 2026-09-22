import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Layers, Edit3 } from 'lucide-react'
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
    minimum_order_value: table?.minimum_order_value?.toString() || '0'
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
        minimum_order_value: Number(form.minimum_order_value) || 0
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
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>{table ? 'Salvar' : 'Criar'}</Button>
        </div>
      </div>
    </Modal>
  )
}
