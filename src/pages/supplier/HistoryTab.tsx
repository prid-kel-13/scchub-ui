import { CheckCircle2 } from 'lucide-react'
import { Mono, POStatusBadge } from '@/components/shared/ui-kit'
import { materialById, supplierScope } from '@/data/mock'
import { useCollab } from '@/lib/collab-store'
import { fmt } from '@/lib/format'

export function HistoryTab({ supplierId }: { supplierId: string }) {
  const s = useCollab()
  const scope = supplierScope(supplierId)
  const mine = new Set(scope.pos.map((p) => p.id))
  const done = scope.pos.filter((p) => p.status === 'Diterima')
  const events = [...s.messages].filter((m) => mine.has(m.poId) && m.from !== 'system').reverse().slice(0, 12)
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="lg:col-span-3">
        <h2 className="text-lg font-semibold text-fg">Pesanan selesai</h2>
        <ul className="mt-4 space-y-3">
          {done.map((po) => {
            const m = materialById(po.materialId)
            return (
              <li key={po.id} className="flex items-center gap-4 rounded-xl border bg-surface px-5 py-4">
                <CheckCircle2 className="size-5 text-success" aria-hidden />
                <div className="flex-1">
                  <div className="text-[15px] font-medium text-fg">{m.name} · {fmt(po.qty)} {m.unit}</div>
                  <div className="text-xs text-fg-muted"><Mono className="text-xs">{po.id}</Mono> · diterima {po.receivedAt} · lulus QC</div>
                </div>
                <POStatusBadge po={po} />
              </li>
            )
          })}
        </ul>
      </section>
      <section className="lg:col-span-2">
        <h2 className="text-lg font-semibold text-fg">Aktivitas terbaru</h2>
        <ol className="mt-4 space-y-4 border-l-2 border-border pl-5">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-surface bg-teal" aria-hidden />
              <div className="text-xs text-fg-subtle">{e.at} · <Mono className="text-xs">{e.poId}</Mono></div>
              <div className="mt-0.5 text-sm text-fg">{e.author}: {e.text}</div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
