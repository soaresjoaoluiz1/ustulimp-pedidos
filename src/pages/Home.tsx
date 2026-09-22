import { useEffect, useState } from 'react'
import { Box, Database, ShoppingCart, Users, Tag, Layers } from 'lucide-react'

interface Health {
  ok: boolean
  service: string
  version: string
  env: string
  counts: {
    users: number
    categories: number
    products: number
    price_tables: number
    customers: number
    orders: number
  }
}

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'api/health')
      .then(r => r.json())
      .then(setHealth)
      .catch(e => setError(String(e)))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-700 text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold tracking-wider uppercase mb-6">
            <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></span>
            Fase 0 · Setup OK
          </div>
          <h1 className="font-display text-5xl font-extrabold tracking-tight mb-3">
            USTU<span className="text-brand-cyan">LIMP</span>
          </h1>
          <p className="text-white/60 text-lg">Portal de pedidos — Produtos de limpeza em geral e químico</p>
        </div>

        {/* Status */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 mb-6">
            <div className="font-semibold mb-1">Erro ao conectar com o servidor</div>
            <div className="text-sm opacity-80">{error}</div>
            <div className="text-sm opacity-80 mt-2">Rode <code className="bg-black/30 px-2 py-0.5 rounded">npm run dev</code> e tente novamente.</div>
          </div>
        )}

        {health && (
          <>
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-brand-cyan/20 flex items-center justify-center">
                  <Database className="w-5 h-5 text-brand-cyan" />
                </div>
                <div>
                  <div className="font-semibold">Backend conectado</div>
                  <div className="text-xs text-white/50">
                    {health.service} v{health.version} · {health.env} · SQLite
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card icon={<Users className="w-5 h-5" />} label="Usuários" value={health.counts.users} hint="admin + clientes" />
              <Card icon={<Tag className="w-5 h-5" />} label="Categorias" value={health.counts.categories} hint="agrupamento" />
              <Card icon={<Box className="w-5 h-5" />} label="Produtos" value={health.counts.products} hint="catálogo Ustulimp" />
              <Card icon={<Layers className="w-5 h-5" />} label="Tabelas de preço" value={health.counts.price_tables} hint="próxima · interior · atacado" />
              <Card icon={<Users className="w-5 h-5" />} label="Clientes" value={health.counts.customers} hint="revendedores" />
              <Card icon={<ShoppingCart className="w-5 h-5" />} label="Pedidos" value={health.counts.orders} hint="acumulado" />
            </div>

            {health.counts.products === 0 && (
              <div className="mt-6 bg-amber-400/10 border border-amber-400/30 rounded-xl p-5">
                <div className="font-semibold text-amber-300 mb-1">Banco vazio</div>
                <div className="text-sm text-white/70">
                  Rode <code className="bg-black/30 px-2 py-0.5 rounded">npm run seed</code> pra popular com o catálogo Ustulimp (29 produtos + 6 categorias + 1 tabela de preço).
                </div>
              </div>
            )}

            {health.counts.products > 0 && (
              <div className="mt-6 bg-emerald-400/10 border border-emerald-400/30 rounded-xl p-5">
                <div className="font-semibold text-emerald-300 mb-1">Tudo pronto pra Fase 1</div>
                <div className="text-sm text-white/70">
                  Banco populado com {health.counts.products} produtos. Próximo: rotas de auth, produtos, pedidos no backend.
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-16 text-xs text-white/40">
          Ustulimp Pedidos · Dros Agência · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}

function Card({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint?: string }) {
  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
        {icon}
        {label}
      </div>
      <div className="font-display text-3xl font-extrabold">{value}</div>
      {hint && <div className="text-xs text-white/40 mt-1">{hint}</div>}
    </div>
  )
}
