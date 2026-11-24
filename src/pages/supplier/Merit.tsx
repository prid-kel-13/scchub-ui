import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Award, CheckCircle2, Circle, HelpCircle, Lightbulb, MessageSquareWarning, Sparkles, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CHART, ChartTooltip, axisProps } from '@/components/shared/charts'
import { useToast } from '@/components/shared/Toast'
import { Chip, Meter } from '@/components/shared/ui-kit'
import { LEVELS, MERIT_EVENTS, MERIT_TREND, SUPPORT, TIPS, TREND_MONTHS, meritFor, type MeritEvent } from '@/data/merit'
import { collab, useCollab } from '@/lib/collab-store'
import { cn } from '@/lib/utils'

const CLARIFY_REASONS = ['Penyebabnya perubahan dari Paragon (spesifikasi/jadwal)', 'Data tidak sesuai dengan catatan kami', 'Sudah disepakati sebelumnya dengan PIC', 'Lainnya']

function ClarifyDialog({ ev, supplierId, onClose }: { ev: MeritEvent; supplierId: string; onClose: () => void }) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Minta klarifikasi</DialogTitle>
          <DialogDescription>{ev.text}. Bila penyebabnya bukan dari pihak Anda, catatan ini dapat tidak dihitung.</DialogDescription>
        </DialogHeader>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Pilih alasan" /></SelectTrigger>
          <SelectContent>{CLARIFY_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button className="bg-teal hover:bg-teal/90" disabled={!reason} onClick={() => {
            collab.requestClarification(ev.id, supplierId, reason)
            toast({ title: 'Permintaan klarifikasi terkirim', body: 'Sinta (Procurement) akan meninjau dan membalas dalam 2 hari kerja. Simulasi.' })
            onClose()
          }}>Kirim</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Merit({ supplierId }: { supplierId: string }) {
  const s = useCollab()
  const toast = useToast()
  const m = meritFor(supplierId)
  const trend = (MERIT_TREND[supplierId] ?? []).map((v, i) => ({ month: TREND_MONTHS[i], nilai: v }))
  const events = MERIT_EVENTS.filter((e) => e.supplierId === supplierId)
  const tasks = s.tasks.filter((t) => t.supplierId === supplierId)
  const support = s.support[supplierId]
  const review = SUPPORT[supplierId]?.review
  const [clarify, setClarify] = useState<MeritEvent | null>(null)
  const nextIdx = LEVELS.findIndex((l) => l.level === m.level)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold tracking-tight text-fg">Nilai Kemitraan</h2>
        <p className="mt-1 max-w-2xl text-[15px] text-fg-muted">Gambaran perkembangan kerja sama Anda dengan Paragon. <span className="font-medium text-fg">Bukan peringkat</span> — tidak dibandingkan dengan supplier lain.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-2xl border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="tnum text-[56px] leading-none font-semibold tracking-tight text-fg">{m.score}</span>
                <span className="text-lg text-fg-muted">/ 100</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Chip tone="teal" icon={Award}>{m.level}</Chip>
                <Chip tone="success" icon={TrendingUp}>+{trend.at(-1)!.nilai - trend[0].nilai} poin sejak Juni</Chip>
              </div>
            </div>
            {m.next && (
              <div className="w-full max-w-[260px] rounded-xl bg-sunken p-3.5">
                <div className="text-xs text-fg-muted">Menuju {m.next.level}</div>
                <div className="mt-1 text-[15px] font-semibold text-fg">{m.next.at - m.score} poin lagi</div>
                <Meter value={(m.score / m.next.at) * 100} tone="teal" className="mt-2" />
              </div>
            )}
          </div>
          <div className="mt-5 h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} domain={[60, 100]} ticks={[60, 70, 80, 90, 100]} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="nilai" name="Nilai kemitraan" stroke={CHART.teal} strokeWidth={2} dot={{ r: 3, fill: CHART.teal, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border bg-surface p-5">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-fg-muted uppercase"><Lightbulb className="size-3.5" /> Langkah berikutnya</div>
          <p className="mt-3 text-[14px] text-fg">
            Bagian yang paling bisa ditingkatkan: <span className="font-semibold">{m.weakest.label}</span> ({m.weakest.value}).
          </p>
          <ul className="mt-3 space-y-2.5">
            {(TIPS[supplierId] ?? ['Pertahankan kinerja Anda dan kabari Paragon lebih awal bila ada kendala.']).map((t) => (
              <li key={t} className="flex gap-2 text-[13px] text-fg-muted"><Sparkles className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />{t}</li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg bg-success-soft px-3 py-2.5 text-[13px] text-success">
            Melapor kendala lebih awal <span className="font-semibold">tidak pernah mengurangi</span> nilai — justru menambah poin keterbukaan.
          </div>
        </section>
      </div>

      <section>
        <h3 className="mb-3 text-[15px] font-semibold text-fg">Komponen nilai</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {m.components.map((c) => (
            <div key={c.key} className="rounded-2xl border bg-surface p-4">
              <div className="text-[13px] font-medium text-fg-muted">{c.label}</div>
              <div className="tnum mt-1 text-2xl font-semibold text-fg">{c.value}</div>
              <Meter value={c.score} tone={c.score >= 90 ? 'success' : c.score >= 75 ? 'teal' : 'warning'} className="mt-2" />
              <div className="mt-2 text-[11.5px] text-fg-subtle">{c.hint} · bobot {c.weight}%</div>
            </div>
          ))}
          <div className="rounded-2xl border border-success/30 bg-success-soft/50 p-4">
            <div className="text-[13px] font-medium text-success">Bonus keterbukaan</div>
            <div className="tnum mt-1 text-2xl font-semibold text-success">+{m.bonus}</div>
            <div className="mt-2 text-[11.5px] text-fg-muted">Untuk kendala yang dilaporkan sebelum tanggal butuh. Hanya bisa menambah.</div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border bg-surface p-5">
          <h3 className="text-[15px] font-semibold text-fg">Mengapa nilai berubah</h3>
          <ul className="mt-3 divide-y">
            {events.map((e) => {
              const cl = s.clarifications.find((c) => c.eventId === e.id)
              return (
                <li key={e.id} className="flex items-start gap-3 py-3">
                  <span className={cn('tnum mt-0.5 w-9 shrink-0 rounded-md py-0.5 text-center text-xs font-semibold', e.delta > 0 ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>
                    {e.delta > 0 ? `+${e.delta}` : `−${Math.abs(e.delta)}`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] text-fg">{e.text}</div>
                    <div className="text-xs text-fg-subtle">{e.component} · {e.at}</div>
                    {cl && <div className="mt-1"><Chip tone={cl.status === 'Tidak dihitung' ? 'success' : cl.status === 'Tetap dihitung' ? 'neutral' : 'info'} icon={MessageSquareWarning}>Klarifikasi: {cl.status}</Chip></div>}
                  </div>
                  {e.delta < 0 && !cl && (
                    <Button size="sm" variant="ghost" className="text-teal" onClick={() => setClarify(e)}><HelpCircle /> Minta klarifikasi</Button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="rounded-2xl border bg-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-[15px] font-semibold text-fg"><Users className="size-4 text-teal" /> Program Pengembangan Bersama</h3>
              <p className="mt-0.5 text-[13px] text-fg-muted">
                {support?.status === 'Mandiri' ? 'Tidak ada program aktif — kinerja Anda stabil.' : `Langkah yang kita sepakati bersama${review && review !== '—' ? ` · ditinjau ${review}` : ''}.`}
              </p>
            </div>
          </div>
          {tasks.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {tasks.map((t) => {
                const mine = t.owner !== 'Paragon'
                return (
                  <li key={t.id}>
                    <button
                      disabled={!mine}
                      onClick={() => { collab.toggleTask(t.id); if (!t.done) toast({ title: 'Langkah ditandai selesai', body: 'Sinta (Procurement) mendapat pemberitahuan. Simulasi.' }) }}
                      className={cn('flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left', mine ? 'hover:bg-sunken' : 'cursor-default')}
                    >
                      {t.done ? <CheckCircle2 className="mt-0.5 size-[18px] shrink-0 text-success" /> : <Circle className="mt-0.5 size-[18px] shrink-0 text-fg-subtle" />}
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-[13.5px]', t.done ? 'text-fg-muted line-through' : 'text-fg')}>{t.text}</span>
                        <span className="text-xs text-fg-subtle">{t.owner === 'Paragon' ? 'Dikerjakan Paragon' : t.owner === 'Bersama' ? 'Bersama' : 'Anda'} · {t.ownerName} · {t.due}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border bg-surface p-5">
        <h3 className="text-[15px] font-semibold text-fg">Tingkat kemitraan & manfaatnya</h3>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LEVELS.map((l, i) => (
            <li key={l.level} className={cn('rounded-xl border p-4', i === nextIdx ? 'border-teal bg-teal-soft/60' : i < nextIdx ? 'bg-sunken' : '')}>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-fg">{l.level}</span>
                <span className="tnum text-xs text-fg-subtle">{l.from}+</span>
              </div>
              <p className="mt-1.5 text-[12.5px] text-fg-muted">{l.benefit}</p>
              {i === nextIdx && <div className="mt-2 text-xs font-semibold text-teal">Tingkat Anda saat ini</div>}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-fg-subtle">Cara hitung: ketepatan waktu 30% · ketepatan jumlah 30% · kecepatan respons 20% · kualitas 20% · ditambah bonus keterbukaan. Bobot & ambang adalah nilai dummy prototipe.</p>
      </section>

      {clarify && <ClarifyDialog ev={clarify} supplierId={supplierId} onClose={() => setClarify(null)} />}
    </div>
  )
}
