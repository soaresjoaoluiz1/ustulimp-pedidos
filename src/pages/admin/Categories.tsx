import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, Button, Input, Modal, Badge, EmptyState, toast } from '@/components/ui'
import { PageHeader } from '@/components/admin/AdminLayout'
import { CategoryIcon } from '@/lib/categoryIcons'

interface Category {
  id: number
  name: string
  slug: string
  icon?: string
  description?: string
  position: number
  is_active: number
  product_count: number
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Category | 'new' | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await api.get<{ categories: Category[] }>('/admin/categories')
      setCategories(data.categories)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function handleDelete(c: Category) {
    if (c.product_count > 0) {
      toast.error(`${c.product_count} produtos nessa categoria. Reatribua antes.`)
      return
    }
    if (!confirm(`Deletar categoria "${c.name}"?`)) return
    try {
      await api.delete(`/admin/categories/${c.id}`)
      toast.success('Categoria deletada')
      load()
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <>
      <PageHeader
        title="Categorias"
        subtitle={`${categories.length} categorias cadastradas`}
        action={
          <Button onClick={() => setEditing('new')}>
            <Plus className="w-4 h-4" /> Nova categoria
          </Button>
        }
      />

      {loading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : categories.length === 0 ? (
        <Card>
          <EmptyState icon={<Tag className="w-7 h-7" />} title="Nenhuma categoria" description="Crie categorias pra organizar seus produtos." action={<Button onClick={() => setEditing('new')}>Criar categoria</Button>} />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            {categories.map(c => (
              <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                <div className="w-10 h-10 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0">
                  <CategoryIcon slug={c.slug} className="w-5 h-5 text-navy-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-navy-800">{c.name}</span>
                    {!c.is_active && <Badge className="bg-slate-100 text-slate-500">Inativa</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">/{c.slug} · {c.product_count} produtos · posição {c.position}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c)} className="text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {editing && (
        <CategoryModal
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </>
  )
}

function CategoryModal({ category, onClose, onSaved }: { category: Category | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(category?.name || '')
  const [icon, setIcon] = useState(category?.icon || '')
  const [description, setDescription] = useState(category?.description || '')
  const [position, setPosition] = useState(String(category?.position || 0))
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    try {
      if (category) {
        await api.put(`/admin/categories/${category.id}`, { name, icon, description, position: Number(position) })
        toast.success('Categoria atualizada')
      } else {
        await api.post('/admin/categories', { name, icon, description, position: Number(position) })
        toast.success('Categoria criada')
      }
      onSaved()
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={category ? 'Editar categoria' : 'Nova categoria'}>
      <div className="space-y-4">
        <Input label="Nome *" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Automotivo" />
        <Input label="Ícone (emoji)" value={icon} onChange={e => setIcon(e.target.value)} placeholder="🚗" maxLength={4} />
        <Input label="Descrição" value={description} onChange={e => setDescription(e.target.value)} placeholder="Opcional" />
        <Input label="Posição" type="number" value={position} onChange={e => setPosition(e.target.value)} hint="Ordem no catálogo (menor = primeiro)" />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>{category ? 'Salvar' : 'Criar'}</Button>
        </div>
      </div>
    </Modal>
  )
}
