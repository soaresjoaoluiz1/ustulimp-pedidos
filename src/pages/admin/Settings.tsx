import { useEffect, useState } from 'react'
import { Plus, Trash2, KeyRound } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, Button, Input, Modal, toast } from '@/components/ui'
import { PageHeader } from '@/components/admin/AdminLayout'
import { useAuth } from '@/context/AuthContext'

interface PaymentTerm {
  id: number
  label: string
  days: string
  position: number
  is_active: number
}

export default function Settings() {
  const { user } = useAuth()
  const [terms, setTerms] = useState<PaymentTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<PaymentTerm | 'new' | null>(null)
  const [pwModal, setPwModal] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await api.get<{ payment_terms: PaymentTerm[] }>('/admin/payment-terms')
      setTerms(data.payment_terms)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function handleDelete(t: PaymentTerm) {
    if (!confirm(`Deletar prazo "${t.label}"?`)) return
    try {
      await api.delete(`/admin/payment-terms/${t.id}`)
      toast.success('Prazo deletado')
      load()
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <>
      <PageHeader title="Configurações" subtitle="Prazos de pagamento e conta" />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Prazos de pagamento */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display font-bold text-navy-800">Prazos de pagamento</h2>
              <p className="text-xs text-slate-500">Aparecem no checkout do cliente</p>
            </div>
            <Button size="sm" onClick={() => setEditing('new')}><Plus className="w-4 h-4" />Novo</Button>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">Carregando…</div>
          ) : (
            <div className="space-y-1">
              {terms.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-slate-50">
                  <div>
                    <div className="font-semibold text-navy-800 text-sm">{t.label}</div>
                    <div className="text-xs text-slate-500">{t.days} dias · pos {t.position}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t)} className="text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Conta */}
        <Card className="p-5">
          <h2 className="font-display font-bold text-navy-800 mb-3">Sua conta</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Nome:</span>
              <span className="font-semibold text-navy-800">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email:</span>
              <span className="font-mono text-xs">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Função:</span>
              <span className="font-semibold capitalize">{user?.role}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <Button variant="secondary" className="w-full" onClick={() => setPwModal(true)}>
              <KeyRound className="w-4 h-4" />Trocar senha
            </Button>
          </div>
        </Card>
      </div>

      {editing && (
        <PaymentTermModal
          term={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}

      {pwModal && <ChangePasswordModal onClose={() => setPwModal(false)} />}
    </>
  )
}

function PaymentTermModal({ term, onClose, onSaved }: { term: PaymentTerm | null; onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState(term?.label || '')
  const [days, setDays] = useState(term?.days || '')
  const [position, setPosition] = useState(term?.position?.toString() || '0')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!label || !days) { toast.error('Preencha label e days'); return }
    setSaving(true)
    try {
      const payload = { label, days, position: Number(position) }
      if (term) await api.put(`/admin/payment-terms/${term.id}`, payload)
      else      await api.post('/admin/payment-terms', payload)
      toast.success('Salvo')
      onSaved()
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={term ? 'Editar prazo' : 'Novo prazo'}>
      <div className="space-y-4">
        <Input label="Texto exibido *" value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: 30 dias, 20/30/40" />
        <Input label="Dias *" value={days} onChange={e => setDays(e.target.value)} placeholder="Ex: 30 ou 20,30,40" hint="Único valor ou separado por vírgula" />
        <Input label="Posição" type="number" value={position} onChange={e => setPosition(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (next !== confirmPw) { toast.error('Senhas não conferem'); return }
    if (next.length < 6) { toast.error('Senha precisa ter ao menos 6 caracteres'); return }
    setSaving(true)
    try {
      await api.post('/auth/change-password', { current_password: current, new_password: next })
      toast.success('Senha alterada')
      onClose()
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Trocar senha">
      <div className="space-y-3">
        <Input label="Senha atual" type="password" value={current} onChange={e => setCurrent(e.target.value)} />
        <Input label="Nova senha" type="password" value={next} onChange={e => setNext(e.target.value)} hint="Mínimo 6 caracteres" />
        <Input label="Confirme a nova senha" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}
