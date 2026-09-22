import { useState, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui'
import Logo from '@/components/Logo'
import { waLink } from '@/lib/company'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from || null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await login(email, password)
      const target = from || (user.role === 'admin' ? '/admin' : '/app')
      navigate(target, { replace: true })
    } catch (err: any) {
      setError(err.message || 'Falha no login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-6 flex items-center justify-center">
        <Logo size="lg" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-card p-8">
            <h1 className="font-display text-2xl font-extrabold text-navy-800 text-center mb-1">Acessar painel</h1>
            <p className="text-sm text-slate-500 text-center mb-6">Entre com seus dados de cliente ou admin</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-500 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} size="lg" className="w-full">
                Acessar
              </Button>
            </form>

            <div className="mt-5 text-center text-xs text-slate-500">
              Esqueceu a senha?{' '}
              {waLink('Olá! Esqueci a senha do portal de pedidos da USTULIMP.')
                ? <a href={waLink('Olá! Esqueci a senha do portal de pedidos da USTULIMP.')!} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-blue">Chame no WhatsApp</a>
                : <span>Fale com o comercial pra gerar uma nova.</span>}
            </div>
          </div>

          {waLink('Olá! Quero ser revendedor da USTULIMP e ter acesso ao portal de pedidos.') && (
            <div className="text-center mt-4 text-xs text-slate-500">
              Ainda não é cliente? {' '}
              <a href={waLink('Olá! Quero ser revendedor da USTULIMP e ter acesso ao portal de pedidos.')!} className="font-semibold text-brand-blue">
                Solicite acesso
              </a>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-slate-400">
        © {new Date().getFullYear()} Ustulimp · Desenvolvido por Dros Agência
      </footer>
    </div>
  )
}
