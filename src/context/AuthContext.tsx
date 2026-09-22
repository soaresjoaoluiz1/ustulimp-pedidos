import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api, getToken, setToken } from '@/lib/api'

export type User = {
  id: number
  name: string
  email: string
  role: 'admin' | 'cliente'
}

export type Customer = {
  id: number
  name: string
  company_name?: string
  price_table_id?: number
  price_table_name?: string
  city?: string
  state?: string
}

type AuthState = {
  user: User | null
  customer: Customer | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const token = getToken()
    if (!token) {
      setUser(null); setCustomer(null); setLoading(false)
      return
    }
    try {
      const data = await api.get<{ user: User; customer: Customer | null }>('/auth/me')
      setUser(data.user)
      setCustomer(data.customer)
    } catch {
      setToken(null)
      setUser(null); setCustomer(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function login(email: string, password: string) {
    const data = await api.post<{ token: string; user: User; customer: Customer | null }>('/auth/login', { email, password })
    setToken(data.token)
    setUser(data.user)
    setCustomer(data.customer)
    return data.user
  }

  function logout() {
    setToken(null)
    setUser(null)
    setCustomer(null)
  }

  return (
    <AuthContext.Provider value={{ user, customer, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}
