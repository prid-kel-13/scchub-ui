import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Info, Target } from 'lucide-react'
import { CHART, ChartTooltip, axisProps } from '@/components/shared/charts'
import { Chip, Mono } from '@/components/shared/ui-kit'
import { FIRM_WEEKS, PROJECTION_RELIABILITY } from '@/data/collab'
import { SUPPLIER_PROJECTION, supplierScope } from '@/data/mock'
import { fmt } from '@/lib/format'
import { cn } from '@/lib/utils'

export function Projection({ supplierId }: { supplierId: string }) {
  const scope = supplierScope(supplierId)
  const [mat, setMat] = useState(scope.materials[0]?.id)
  const firm = FIRM_WEEKS[supplierId] ?? {}
  const data = (SUPPLIER_PROJECTION[supplierId] ?? []).map((w) => ({ ...w, qty: Number(w[mat] ?? 0), firm: (firm[w.week] ?? []).includes(mat) }))
  const m = scope.materials.find((x) => x.id === mat)!
  const total = data.reduce((s, w) => s + w.qty, 0)
  const firmTotal = data.filter((w) => w.firm).reduce((s, w) => s + w.qty, 0)
  const rel = PROJECTION_RELIABILITY[supplierId]

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[22px] font-semibold tracking-tight text-fg">Proyeksi kebutuhan 12 minggu</h2>
          <Chip tone="warning" icon={Info}>Sebagian indikatif</Chip>
        </div>
        <p className="mt-1 max-w-2xl text-[15px] text-fg-muted">
          Untuk material yang Anda pasok, agar kapasitas dan bahan baku bisa disiapkan lebih awal. Batang penuh = <span className="font-medium text-fg">pasti</span> (sudah ada PO/call-off). Batang muda = <span className="font-medium text-fg">indikatif</span>, bukan pesanan.
        </p>
      </div>

      <div className="inline-flex rounded-xl bg-surface p-1 ring-1 ring-border" role="tablist">
        {scope.materials.map((x) => (
          <button key={x.id} role="tab" aria-selected={mat === x.id} onClick={() => setMat(x.id)}
            className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors', mat === x.id ? 'bg-teal text-white' : 'text-fg-muted hover:text-fg')}>
            {x.name}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-2xl border bg-surface p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-sm text-fg-muted">{m.name} · <Mono>{m.id}</Mono></div>
            <div className="text-sm text-fg-muted">Total 12 minggu <span className="tnum font-semibold text-fg">{fmt(total)} {m.unit}</span> · pasti <span className="tnum font-semibold text-fg">{fmt(firmTotal)}</span></div>
          </div>
          <div className="mb-3 flex gap-4 text-xs text-fg-muted">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-teal" aria-hidden />Pasti (PO/call-off)</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-teal/35" aria-hidden />Indikatif</span>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="week" {...axisProps} />
                <YAxis {...axisProps} width={44} tickFormatter={(v: number) => (v ? `${v / 1000}rb` : '0')} />
                <Tooltip cursor={{ fill: 'rgb(14 147 137 / 0.06)' }}
                  content={<ChartTooltip unit={m.unit} labelFormatter={(l, p) => `${l} · ${String(p?.[0]?.payload?.range ?? '')} · ${p?.[0]?.payload?.firm ? 'pasti' : 'indikatif'}`} />} />
                <Bar dataKey="qty" name="Kebutuhan" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {data.map((w) => <Cell key={w.week} fill={CHART.teal} fillOpacity={w.firm ? 1 : 0.35} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-fg-subtle">Horizon 12 minggu adalah nilai dummy prototipe.</p>
        </div>

        {rel && (
          <section className="rounded-2xl border bg-surface p-5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-fg-muted uppercase"><Target className="size-3.5" /> Seberapa tepat proyeksi kami</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="tnum text-[34px] leading-none font-semibold text-fg">{rel.accuracy}%</span>
              <span className="text-sm text-fg-muted">akurasi 8 minggu terakhir</span>
            </div>
            <p className="mt-2 text-[13px] text-fg-muted">Kami juga dinilai: angka ini menunjukkan seberapa dekat proyeksi Paragon dengan pesanan yang benar-benar terbit.</p>
            <table className="mt-4 w-full text-[13px]">
              <thead><tr className="text-left text-xs text-fg-subtle"><th className="pb-1.5 font-medium">Minggu</th><th className="pb-1.5 text-right font-medium">Proyeksi</th><th className="pb-1.5 text-right font-medium">Pesanan</th></tr></thead>
              <tbody>
                {rel.weeks.map((w) => (
                  <tr key={w.week} className="border-t">
                    <td className="py-1.5">{w.week}</td>
                    <td className="tnum py-1.5 text-right text-fg-muted">{fmt(w.projected)}</td>
                    <td className="tnum py-1.5 text-right font-medium">{fmt(w.actual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  )
}
