import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Search, Wand2, Filter } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, Button, Input, Modal, Badge, toast } from '@/components/ui'
import { PageHeader } from '@/components/admin/AdminLayout'
import { fmtBRL } from '@/lib/format'

interface PriceTable {
  id: number
  name: string
  slug: string
  description?: string
  minimum_order_value: number
}

interface Item {
  product_id: number
  sku?: string
  name: string
  unit?: string
  market_price?: number
  product_active: number
  category_name?: string
  category_id?: number
  pti_id?: number
  price?: number
  is_active: number
}

export default function PriceTableEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [table, setTable] = useState<PriceTable | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [showOnlyMissing, setShowOnlyMissing] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await api.get<{ price_table: PriceTable; items: Item[] }>(`/admin/price-tables/${id}/items`)
      setTable(data.price_table)
      setItems(data.items)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  const categories = useMemo(() => {
    const map = new Map<number, string>()
    items.forEach(i => { if (i.category_id && i.category_name) map.set(i.category_id, i.category_name) })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [items])

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (showOnlyMissing && i.price != null) return false
      if (categoryFilter && i.category_id?.toString() !== categoryFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!i.name.toLowerCase().includes(q) && !i.sku?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [items, search, categoryFilter, showOnlyMissing])

  const stats = useMemo(() => {
    const total = items.length
    const withPrice = items.filter(i => i.price != null).length
    return { total, withPrice, missing: total - withPrice }
  }, [items])

  function updateItem(productId: number, patch: Partial<Item>) {
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, ...patch, _dirty: true } as any : i))
  }

  async function saveAll() {
    const dirty = items.filter((i: any) => i._dirty)
    if (dirty.length === 0) { toast.info('Nenhuma alteração pra salvar'); return }
    setSaving(true)
    try {
      const payload = {
        items: dirty.map(i => ({
          product_id: i.product_id,
          price: Number(i.price) || 0,
          is_active: !!i.is_active,
          remove: i.price == null || Number(i.price) === 0
        }))
      }
      await api.put(`/admin/price-tables/${id}/items`, payload)
      toast.success(`${dirty.length} produto(s) salvo(s)`)
      load()
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  if (loading || !table) return <div className="text-sm text-slate-500">Carregando…</div>

  const dirtyCount = items.filter((i: any) => i._dirty).length

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/price-tables')}>
          <ArrowLeft className="w-4 h-4" /> Tabelas
        </Button>
      </div>
      <PageHeader
        title={table.name}
        subtitle={`${stats.withPrice} de ${stats.total} produtos com preço · ${stats.missing} sem preço`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setBulkOpen(true)}><Wand2 className="w-4 h-4" />Aplicar em massa</Button>
            <Button onClick={saveAll} loading={saving} disabled={dirtyCount === 0}>
              <Save className="w-4 h-4" />Salvar {dirtyCount > 0 && `(${dirtyCount})`}
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <Card className="p-3 mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar produto…"
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-navy-500 focus:bg-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-navy-500 focus:bg-white"
        >
          <option value="">Todas categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button
          variant={showOnlyMissing ? 'primary' : 'secondary'}
          onClick={() => setShowOnlyMissing(v => !v)}
        >
          <Filter className="w-4 h-4" />
          {showOnlyMissing ? 'Mostrar todos' : 'Só sem preço'}
        </Button>
      </Card>

      {/* Tabela */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <input type="checkbox" disabled className="opacity-30" />
                </th>
                <th className="px-4 py-3 text-left">Produto</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Categoria</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Mercado</th>
                <th className="px-4 py-3 text-right w-40">Preço na tabela</th>
                <th className="px-4 py-3 text-center w-24">Ativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(i => (
                <tr key={i.product_id} className={(i as any)._dirty ? 'bg-amber-50' : 'hover:bg-slate-50'}>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${i.price != null ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-semibold text-navy-800 text-sm">{i.name}</div>
                    <div className="text-xs text-slate-500">SKU {i.sku || '—'} · {i.unit}</div>
                  </td>
                  <td className="px-4 py-2 hidden sm:table-cell text-slate-600 text-xs">{i.category_name || '—'}</td>
                  <td className="px-4 py-2 hidden md:table-cell text-right text-xs text-slate-500">{fmtBRL(i.market_price)}</td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="—"
                      value={i.price ?? ''}
                      onChange={e => updateItem(i.product_id, { price: e.target.value === '' ? undefined : (Number(e.target.value) as any) })}
                      className="w-28 px-2 py-1.5 border border-slate-200 rounded-md text-right text-sm font-semibold text-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-500"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={i.is_active === 1}
                      onChange={e => updateItem(i.product_id, { is_active: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4"
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-sm text-slate-500">Nenhum produto encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {bulkOpen && (
        <BulkApplyModal
          items={items}
          filtered={filtered}
          onClose={() => setBulkOpen(false)}
          onApply={(updates) => {
            setItems(prev => prev.map(i => {
              const u = updates[i.product_id]
              return u !== undefined ? ({ ...i, price: u, is_active: 1, _dirty: true } as any) : i
            }))
            setBulkOpen(false)
            toast.info(`${Object.keys(updates).length} produtos atualizados (clique Salvar pra confirmar)`)
          }}
        />
      )}
    </>
  )
}

function BulkApplyModal({ items, filtered, onClose, onApply }: { items: Item[]; filtered: Item[]; onClose: () => void; onApply: (u: Record<number, number>) => void }) {
  const [mode, setMode] = useState<'fixed' | 'multiply' | 'discount' | 'from_market'>('multiply')
  const [value, setValue] = useState('')
  const [scope, setScope] = useState<'visible' | 'all'>('visible')

  function apply() {
    const v = Number(value)
    if (!v && mode !== 'fixed') { toast.error('Informe um valor'); return }
    const target = scope === 'visible' ? filtered : items
    const updates: Record<number, number> = {}
    target.forEach(i => {
      let newPrice: number | undefined
      if (mode === 'fixed') newPrice = v
      else if (mode === 'multiply') newPrice = i.price ? i.price * v : (i.market_price ? i.market_price * 0.5 * v : 0)
      else if (mode === 'discount') newPrice = i.market_price ? i.market_price * (1 - v / 100) : 0
      else if (mode === 'from_market') newPrice = i.market_price ? i.market_price * (v / 100) : 0
      if (newPrice && newPrice > 0) updates[i.product_id] = +newPrice.toFixed(2)
    })
    onApply(updates)
  }

  return (
    <Modal open onClose={onClose} title="Aplicar preços em massa">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          Use esta ferramenta pra ajustar vários preços de uma vez. Funciona em <strong>{scope === 'visible' ? `${filtered.length} produtos visíveis` : `todos os ${items.length} produtos`}</strong>.
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Aplicar em:</label>
          <div className="flex gap-2">
            <Button size="sm" variant={scope === 'visible' ? 'primary' : 'secondary'} onClick={() => setScope('visible')}>Apenas filtrados ({filtered.length})</Button>
            <Button size="sm" variant={scope === 'all' ? 'primary' : 'secondary'} onClick={() => setScope('all')}>Todos ({items.length})</Button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Modo:</label>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant={mode === 'multiply' ? 'primary' : 'secondary'} onClick={() => setMode('multiply')}>× multiplicar atual</Button>
            <Button size="sm" variant={mode === 'fixed' ? 'primary' : 'secondary'} onClick={() => setMode('fixed')}>Preço fixo</Button>
            <Button size="sm" variant={mode === 'from_market' ? 'primary' : 'secondary'} onClick={() => setMode('from_market')}>% do preço de mercado</Button>
            <Button size="sm" variant={mode === 'discount' ? 'primary' : 'secondary'} onClick={() => setMode('discount')}>Desconto sobre mercado</Button>
          </div>
        </div>

        <Input
          label={
            mode === 'fixed' ? 'Preço fixo (R$)' :
            mode === 'multiply' ? 'Multiplicador (ex: 1.10 = +10%)' :
            mode === 'from_market' ? 'Percentual do preço de mercado (ex: 50 = 50%)' :
            'Desconto sobre mercado (%)'
          }
          type="number"
          step="0.01"
          value={value}
          onChange={e => setValue(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={apply}>Aplicar (não salva ainda)</Button>
        </div>
      </div>
    </Modal>
  )
}
