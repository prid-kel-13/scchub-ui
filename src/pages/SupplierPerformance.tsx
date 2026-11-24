import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, CheckCircle2, Circle, Globe2, HeartHandshake, MessageSquareWarning, Plus, Rocket, ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/shared/Toast'
import { Chip, DataTable, Meter, Mono, PageHeader, Panel, SimTag, Td, Th } from '@/components/shared/ui-kit'
import { IMPORT_EXPOSED, MERIT_EVENTS, MERIT_TREND, SUPPORT, meritFor, type SupportStatus } from '@/data/merit'
import { SUPPLIERS, poById, supplierById } from '@/data/mock'
import { collab, useCollab } from '@/lib/collab-store'
import { accessFor } from '@/lib/nav'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

const STATUS_TONE: Record<SupportStatus, 'success' | 'warning' | 'danger'> = { Mandiri: 'success', Dipantau: 'warning', 'Perlu Pendampingan': 'danger' }

function Spark({ values }: { values: number[] }) {
  const min = Math.min(...values) - 2
  const max = Math.max(...values) + 2
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 64},${20 - ((v - min) / (max - min)) * 18}`).join(' ')
  const up = values.at(-1)! >= values[0]
  return (
    <svg width="64" height="22" viewBox="0 0 64 22" aria-label={`Tren ${values[0]} ke ${values.at(-1)}`}>
      <polyline points={pts} fill="none" stroke={up ? 'var(--accent-teal)' : 'var(--warning)'} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Detail({ supplierId, canManage }: { supplierId: string; canManage: boolean }) {
  const s = useCollab()
  const toast = useToast()
  const sup = supplierById(supplierId)
  const m = meritFor(supplierId)
  const support = s.support[supplierId]
  const [status, setStatus] = useState<SupportStatus>(support.status)
  const [reason, setReason] = useState(support.reason)
  const [task, setTask] = useState('')
  const [owner, setOwner] = useState<'Supplier' | 'Paragon' | 'Bersama'>('Bersama')
  const tasks = s.tasks.filter((t) => t.supplierId === supplierId)
  const clar = s.clarifications.filter((c) => c.supplierId === supplierId)
  const rm = Object.entries(s.rawMaterial).filter(([po]) => poById(po).supplierId === supplierId)
  const dirty = status !== support.status || reason !== support.reason

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <Panel title={<>{sup.name} <span className="font-normal text-fg-muted">· {sup.alias}</span></>} description={`${sup.channel} · ${sup.city} · kontak ${sup.contact}`} className="xl:col-span-7" icon={ShieldCheck}
        actions={<Button size="sm" variant="ghost" className="text-brand" asChild><Link to="/supplier-collaboration?tab=inbox">Percakapan <ArrowRight /></Link></Button>}>
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <div className="text-xs text-fg-muted">Nilai kemitraan</div>
            <div className="tnum text-[40px] leading-none font-semibold text-fg">{m.score}</div>
            <div className="mt-1 text-xs text-fg-muted">{m.level} · bonus keterbukaan +{m.bonus}</div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-x-5 gap-y-2.5 sm:grid-cols-4">
            {m.components.map((c) => (
              <div key={c.key}>
                <div className="text-[11.5px] text-fg-muted">{c.label}</div>
                <div className="tnum text-[15px] font-semibold text-fg">{c.value}</div>
                <Meter value={c.score} tone={c.score >= 90 ? 'success' : c.score >= 75 ? 'teal' : 'warning'} className="mt-1" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-sunken p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-fg-muted"><Globe2 className="size-3.5" /> Bahan baku supplier</div>
            <div className="mt-1 text-[13px] text-fg">{IMPORT_EXPOSED[supplierId] ? `Bergantung impor: ${IMPORT_EXPOSED[supplierId]}` : 'Bahan baku lokal'}</div>
            {rm.length > 0 && <div className="mt-1 space-y-0.5 text-xs text-fg-muted">{rm.map(([po, v]) => <div key={po}>Laporan terakhir <Mono className="text-xs">{po}</Mono>: <span className={cn('font-medium', v === 'Ada kendala' ? 'text-danger' : v === 'Sedang dipesan' ? 'text-warning' : 'text-success')}>{v}</span></div>)}</div>}
          </div>
          <div className="rounded-lg bg-sunken p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-fg-muted"><Rocket className="size-3.5" /> Rilis PO lebih awal</div>
            <div className="mt-1 text-[13px] text-fg">{s.earlyRelease[supplierId] ? 'Aktif — PO dirilis 2 minggu lebih awal agar supplier sempat memesan bahan baku.' : 'Tidak aktif'}</div>
            {canManage && (
              <Button size="sm" variant="outline" className="mt-2" onClick={() => { collab.toggleEarlyRelease(supplierId); toast({ title: s.earlyRelease[supplierId] ? 'Rilis lebih awal dimatikan' : 'Rilis lebih awal diaktifkan', body: 'Penanda internal untuk Procurement & Planner (simulasi).' }) }}>
                {s.earlyRelease[supplierId] ? 'Matikan' : 'Aktifkan'}
              </Button>
            )}
          </div>
        </div>

        <h3 className="mt-5 mb-2 text-[13px] font-semibold text-fg">Catatan nilai terbaru</h3>
        <ul className="divide-y text-[13px]">
          {MERIT_EVENTS.filter((e) => e.supplierId === supplierId).slice(0, 4).map((e) => (
            <li key={e.id} className="flex gap-3 py-2">
              <span className={cn('tnum w-8 shrink-0 font-semibold', e.delta > 0 ? 'text-success' : 'text-warning')}>{e.delta > 0 ? `+${e.delta}` : `−${Math.abs(e.delta)}`}</span>
              <span className="text-fg">{e.text}</span>
              <span className="ml-auto shrink-0 text-xs text-fg-subtle">{e.at}</span>
            </li>
          ))}
          {MERIT_EVENTS.filter((e) => e.supplierId === supplierId).length === 0 && <li className="py-2 text-fg-muted">Tidak ada catatan baru.</li>}
        </ul>
      </Panel>

      <div className="flex flex-col gap-5 xl:col-span-5">
        <Panel title="Status pendampingan" description="Internal — supplier hanya melihat program pengembangan bersama, bukan label status." icon={HeartHandshake}>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={STATUS_TONE[support.status]}>{support.status}</Chip>
            {SUPPORT[supplierId].review !== '—' && <span className="text-xs text-fg-muted">sejak {SUPPORT[supplierId].since} · tinjau {SUPPORT[supplierId].review}</span>}
          </div>
          {canManage ? (
            <div className="mt-3 space-y-2">
              <Select value={status} onValueChange={(v) => setStatus(v as SupportStatus)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{(['Mandiri', 'Dipantau', 'Perlu Pendampingan'] as SupportStatus[]).map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan (wajib)" aria-label="Alasan status" />
              <Button size="sm" disabled={!dirty || !reason.trim()} onClick={() => { collab.setSupport(supplierId, status, reason.trim()); toast({ title: 'Status pendampingan diperbarui', body: 'Tidak memblokir PO — hanya menentukan dukungan yang diberikan (simulasi).' }) }}>Simpan status</Button>
            </div>
          ) : (
            <p className="mt-2 text-[13px] text-fg-muted">{support.reason}</p>
          )}
          <p className="mt-3 text-xs text-fg-subtle">Tidak ada daftar hitam: status ini tidak memblokir PO, hanya menentukan dukungan yang diberikan.</p>
        </Panel>

        <Panel title="Program pengembangan bersama" description="Langkah yang terlihat juga oleh supplier" icon={Users}>
          <ul className="space-y-1">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-2.5 py-1.5 text-[13px]">
                {t.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <Circle className="mt-0.5 size-4 shrink-0 text-fg-subtle" />}
                <span className="min-w-0 flex-1"><span className={cn(t.done ? 'text-fg-muted line-through' : 'text-fg')}>{t.text}</span><span className="block text-xs text-fg-subtle">{t.owner} · {t.ownerName} · {t.due}</span></span>
              </li>
            ))}
            {tasks.length === 0 && <li className="text-[13px] text-fg-muted">Belum ada langkah.</li>}
          </ul>
          {canManage && (
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!task.trim()) return; collab.addTask({ supplierId, text: task.trim(), owner, ownerName: owner === 'Paragon' ? 'Sinta' : owner === 'Supplier' ? sup.contact.split(' ')[0] : 'Bersama', due: 'Baru' }); setTask('') }}>
              <Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Tambah langkah…" className="h-9" aria-label="Langkah baru" />
              <Select value={owner} onValueChange={(v) => setOwner(v as typeof owner)}>
                <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>{(['Supplier', 'Paragon', 'Bersama'] as const).map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
              </Select>
              <Button type="submit" size="icon" className="size-9" aria-label="Tambah langkah"><Plus /></Button>
            </form>
          )}
        </Panel>

        {clar.length > 0 && (
          <Panel title="Permintaan klarifikasi nilai" icon={MessageSquareWarning}>
            <ul className="divide-y">
              {clar.map((c) => {
                const ev = MERIT_EVENTS.find((e) => e.id === c.eventId)!
                return (
                  <li key={c.id} className="py-2.5 text-[13px]">
                    <div className="text-fg">{ev.text} <span className="text-fg-muted">({ev.delta})</span></div>
                    <div className="text-xs text-fg-muted">Alasan supplier: {c.note}</div>
                    {c.status === 'Ditinjau' && canManage ? (
                      <div className="mt-2 flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => { collab.decideClarification(c.id, 'Tidak dihitung'); toast({ title: 'Catatan tidak dihitung', body: 'Supplier diberi tahu (simulasi).' }) }}>Tidak dihitung</Button>
                        <Button size="sm" variant="outline" onClick={() => collab.decideClarification(c.id, 'Tetap dihitung')}>Tetap dihitung</Button>
                      </div>
                    ) : (
                      <Chip className="mt-1.5" tone={c.status === 'Tidak dihitung' ? 'success' : c.status === 'Ditinjau' ? 'info' : 'neutral'}>{c.status}</Chip>
                    )}
                  </li>
                )
              })}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  )
}

export function SupplierPerformance() {
  const { user } = useSession()
  const access = user ? accessFor(user.id, 'performance') : null
  const canManage = access === 'Kelola'
  const s = useCollab()
  const [sel, setSel] = useState('SUP-A')
  const rows = SUPPLIERS.map((sup) => ({ sup, m: meritFor(sup.id), support: s.support[sup.id] }))
  const count = (st: SupportStatus) => rows.filter((r) => r.support.status === st).length
  const openClar = s.clarifications.filter((c) => c.status === 'Ditinjau').length

  return (
    <>
      <PageHeader
        title="Supplier Performance & Pendampingan"
        description="Nilai kemitraan per supplier dan status pendampingan. Supplier yang kesulitan ditandai untuk dibantu tumbuh — tidak masuk daftar hitam."
        meta={<>{access && <Chip tone="info">Akses Anda: {access}</Chip>}<SimTag /></>}
      />
      <div className="mb-5 grid grid-cols-2 divide-x overflow-hidden rounded-xl border bg-surface shadow-[var(--shadow-card)] md:grid-cols-4">
        {[
          { label: 'Mandiri', v: count('Mandiri'), tone: 'text-success' },
          { label: 'Dipantau', v: count('Dipantau'), tone: 'text-warning' },
          { label: 'Perlu Pendampingan', v: count('Perlu Pendampingan'), tone: 'text-danger' },
          { label: 'Klarifikasi menunggu', v: openClar, tone: openClar ? 'text-brand' : 'text-fg' },
        ].map((k, i) => (
          <div key={k.label} className={cn('px-5 py-4', i >= 2 && 'max-md:border-t', i === 2 && 'max-md:border-l-0')}>
            <div className="text-[12.5px] font-medium text-fg-muted">{k.label}</div>
            <div className={cn('tnum mt-1 text-[28px] leading-none font-semibold', k.tone)}>{k.v}</div>
          </div>
        ))}
      </div>

      <Panel title="Supplier" description="Klik baris untuk melihat detail & program pengembangan" className="mb-5" bodyClassName="pb-1">
        <DataTable minWidth={980}>
          <thead>
            <tr><Th>Supplier</Th><Th align="right">Nilai</Th><Th>Tren 6 bln</Th><Th align="right">Tepat waktu</Th><Th align="right">Tepat jumlah</Th><Th align="right">Respons</Th><Th align="right">Kualitas</Th><Th>Bahan baku</Th><Th>Status</Th></tr>
          </thead>
          <tbody>
            {rows.map(({ sup, m, support }) => (
              <tr key={sup.id} onClick={() => setSel(sup.id)} className={cn('cursor-pointer transition-colors hover:bg-sunken', sel === sup.id && 'bg-brand-soft/60 hover:bg-brand-soft/60')}>
                <Td><div className="font-medium whitespace-nowrap text-fg">{sup.name}</div><div className="text-[11.5px] text-fg-subtle">{sup.alias} · {sup.channel}</div></Td>
                <Td align="right"><span className="text-[15px] font-semibold">{m.score}</span><div className="text-[11px] whitespace-nowrap text-fg-subtle">{m.level}</div></Td>
                <Td><Spark values={MERIT_TREND[sup.id]} /></Td>
                {m.components.map((c) => <Td key={c.key} align="right" className={cn(c.score < 75 && 'font-semibold text-warning')}>{c.value}</Td>)}
                <Td className="text-xs whitespace-nowrap text-fg-muted">{IMPORT_EXPOSED[sup.id] ? <span className="flex items-center gap-1"><Globe2 className="size-3.5" /> Impor{s.earlyRelease[sup.id] && ' · rilis awal'}</span> : 'Lokal'}</Td>
                <Td><Chip tone={STATUS_TONE[support.status]}>{support.status}</Chip></Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>

      <Detail key={sel} supplierId={sel} canManage={canManage} />
    </>
  )
}
