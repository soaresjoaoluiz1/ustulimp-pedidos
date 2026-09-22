import { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { X } from 'lucide-react'

/* ────────── BUTTON ────────── */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, disabled, className, children, ...rest }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = {
    sm: 'px-3 py-1.5 text-sm h-8',
    md: 'px-4 py-2 text-sm h-10',
    lg: 'px-6 py-3 text-base h-12'
  }
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-navy-800 text-white hover:bg-navy-700 active:scale-95',
    secondary: 'bg-white border border-slate-200 text-navy-800 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600'
  }
  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}

/* ────────── INPUT ────────── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}
export function Input({ label, error, hint, className, ...rest }: InputProps) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</span>}
      <input
        className={cn(
          'w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none transition',
          'focus:ring-2 focus:ring-navy-200 focus:border-navy-500',
          error ? 'border-red-400' : 'border-slate-200',
          className
        )}
        {...rest}
      />
      {error && <span className="block text-xs text-red-500 mt-1">{error}</span>}
      {hint && !error && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  )
}

/* ────────── SELECT ────────── */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}
export function Select({ label, error, className, children, ...rest }: SelectProps) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</span>}
      <select
        className={cn(
          'w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none transition',
          'focus:ring-2 focus:ring-navy-200 focus:border-navy-500',
          error ? 'border-red-400' : 'border-slate-200',
          className
        )}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="block text-xs text-red-500 mt-1">{error}</span>}
    </label>
  )
}

/* ────────── TEXTAREA ────────── */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}
export function Textarea({ label, className, ...rest }: TextareaProps) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</span>}
      <textarea
        className={cn(
          'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none',
          'focus:ring-2 focus:ring-navy-200 focus:border-navy-500 resize-y',
          className
        )}
        {...rest}
      />
    </label>
  )
}

/* ────────── CARD ────────── */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('bg-white rounded-xl shadow-card', className)}>{children}</div>
}

/* ────────── BADGE ────────── */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', className)}>
      {children}
    </span>
  )
}

/* ────────── MODAL ────────── */
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={cn('bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col', sizes[size])}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 id="modal-title" className="font-display text-lg font-bold text-navy-800">{title}</h3>
            <button onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-lg hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-navy-500">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto p-6 flex-1">{children}</div>
      </div>
    </div>
  )
}

/* ────────── EMPTY STATE ────────── */
export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-16 px-6">
      {icon && <div className="inline-flex w-16 h-16 rounded-2xl bg-slate-100 items-center justify-center mb-4 text-slate-400">{icon}</div>}
      <h3 className="font-display text-lg font-bold text-navy-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">{description}</p>}
      {action}
    </div>
  )
}

/* ────────── TOAST (manual) ────────── */
let toastIdCounter = 0
type ToastItem = { id: number; type: 'success' | 'error' | 'info'; message: string }
const toastListeners: Array<(items: ToastItem[]) => void> = []
let toastItems: ToastItem[] = []

export const toast = {
  success: (msg: string) => pushToast('success', msg),
  error: (msg: string) => pushToast('error', msg),
  info: (msg: string) => pushToast('info', msg)
}

function pushToast(type: ToastItem['type'], message: string) {
  const id = ++toastIdCounter
  toastItems = [...toastItems, { id, type, message }]
  toastListeners.forEach(l => l(toastItems))
  setTimeout(() => {
    toastItems = toastItems.filter(t => t.id !== id)
    toastListeners.forEach(l => l(toastItems))
  }, 4000)
}

import { useState } from 'react'
export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => {
    toastListeners.push(setItems)
    return () => { toastListeners.splice(toastListeners.indexOf(setItems), 1) }
  }, [])
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {items.map(t => (
        <div
          key={t.id}
          className={cn(
            'px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right',
            t.type === 'success' && 'bg-emerald-500 text-white',
            t.type === 'error' && 'bg-red-500 text-white',
            t.type === 'info' && 'bg-navy-700 text-white'
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
