import { ReactNode, useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, User, LogOut, Package, ChevronDown, MessageSquare, Mail } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { fmtBRL } from '@/lib/format'
import { cn } from '@/lib/cn'
import Logo from '@/components/Logo'
import { COMPANY, waLink } from '@/lib/company'

interface Props {
  children: ReactNode
  search?: string
  onSearchChange?: (s: string) => void
  onCartClick: () => void
}

export default function CustomerLayout({ children, search, onSearchChange, onCartClick }: Props) {
  const { user, customer, logout } = useAuth()
  const { subtotal, totalItems, totalQty } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  /* Close menu on click outside */
  useEffect(() => {
    if (!menuOpen) return
    const onClick = () => setMenuOpen(false)
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [menuOpen])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-6 h-16">
            {/* Logo */}
            <Link to="/app" className="flex items-center gap-2 flex-shrink-0">
              <Logo size="sm" />
            </Link>

            {/* Search */}
            {onSearchChange && (
              <div className="flex-1 max-w-xl">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search || ''}
                    onChange={e => onSearchChange(e.target.value)}
                    placeholder="Buscar produto…"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm outline-none focus:bg-white focus:border-navy-500 focus:ring-2 focus:ring-navy-200"
                  />
                </div>
              </div>
            )}
            {!onSearchChange && <div className="flex-1" />}

            {/* Cart button */}
            <button
              onClick={onCartClick}
              className="relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-navy-50 hover:bg-navy-100 transition group"
            >
              <ShoppingCart className="w-5 h-5 text-navy-700" />
              {totalQty > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-brand-cyan text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shadow">
                  {totalQty}
                </span>
              )}
              <span className="hidden md:block text-sm font-semibold text-navy-800">
                {totalItems > 0 ? fmtBRL(subtotal) : 'Carrinho'}
              </span>
            </button>

            {/* User menu */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="w-9 h-9 rounded-full bg-navy-100 hover:bg-navy-200 flex items-center justify-center text-navy-700 font-bold text-sm"
                title={user?.name}
              >
                {user?.name?.[0]?.toUpperCase() || 'C'}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="font-semibold text-navy-800 text-sm truncate">{user?.name}</div>
                    <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                    {customer?.price_table_name && (
                      <div className="mt-1.5 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">{customer.price_table_name}</span>
                      </div>
                    )}
                  </div>
                  <NavLink to="/app/orders" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                    <Package className="w-4 h-4" /> Meus pedidos
                  </NavLink>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 border-t border-slate-100">
                    <LogOut className="w-4 h-4" /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          {/* Logo */}
          <Logo size="md" className="justify-center mb-3" />

          {/* Descrição */}
          <div className="text-xs text-slate-500 mb-1">{COMPANY.tagline}</div>
          <div className="text-xs text-slate-400 mb-4">CNPJ {COMPANY.cnpj} · {COMPANY.address}</div>

          {/* Contatos como links de texto */}
          {(COMPANY.whatsapp || COMPANY.email) && (
            <div className="text-sm text-slate-600 space-y-1 mb-5">
              {COMPANY.whatsapp && (
                <div>
                  WhatsApp:{' '}
                  <a
                    href={waLink('Olá! Preciso de ajuda com meu pedido no portal da USTULIMP.') || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand-blue hover:underline"
                  >
                    {COMPANY.whatsappLabel}
                  </a>
                </div>
              )}
              {COMPANY.email && (
                <div>
                  Email:{' '}
                  <a href={`mailto:${COMPANY.email}`} className="font-semibold text-brand-blue hover:underline">
                    {COMPANY.email}
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-slate-400">
            © {new Date().getFullYear()} · Desenvolvido por{' '}
            <a
              href="https://drosagencia.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-blue hover:underline"
            >
              Dros Agência
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
