import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, X } from 'lucide-react'

interface ToastItem {
  id: number
  title: string
  body?: string
}
const Ctx = createContext<(t: Omit<ToastItem, 'id'>) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random()
    setItems((s) => [...s, { ...t, id }])
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 5000)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface px-4 py-3 shadow-[var(--shadow-pop)] animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-fg">{t.title}</div>
              {t.body && <div className="mt-0.5 text-[13px] text-fg-muted">{t.body}</div>}
            </div>
            <button className="text-fg-subtle hover:text-fg" aria-label="Tutup" onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))}>
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(Ctx)
