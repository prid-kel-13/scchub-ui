import { useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router'
import {
  AlarmClock,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FlaskConical,
  History,
  LineChart,
  MessageCircle,
  MessageSquareText,
  Package,
  PackageCheck,
  Phone,
  RefreshCw,
  ShieldOff,
  Timer,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProfileMenu } from '@/components/shell/AppShell'
import { Logo } from '@/components/shared/Logo'
import { Thread } from '@/components/shared/Thread'
import { useToast } from '@/components/shared/Toast'
import { Chip, Mono, POStatusBadge } from '@/components/shared/ui-kit'
import { SUPPLIER_PIC } from '@/data/collab'
import { materialById, poById, supplierById, supplierScope } from '@/data/mock'
import type { DemoUser, PurchaseOrder } from '@/data/types'
import { collab, docsFor, useCollab } from '@/lib/collab-store'
import { fmt } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ChangeDialog, ConfirmDialog, EstimateDialog, ShipDialog } from './dialogs'
import { Documents } from './Documents'
import { HistoryTab } from './HistoryTab'
import { Projection } from './Projection'

type DialogKind = 'confirm' | 'estimate' | 'ship' | 'change'
interface Ctx {
  user: DemoUser
  supplierId: string
  author: string
}

function useAck() {
  const toast = useToast()
  return (title = 'Terima kasih, pembaruan terkirim') => toast({ title, body: 'Sinta (Procurement) sudah menerima pembaruan Anda dan akan membalas di percakapan PO.' })
}

/* ------------------------------------------------------------------ Dialog host */
function ActionDialog({ kind, po, ctx, onClose }: { kind: DialogKind; po: PurchaseOrder; ctx: Ctx; onClose: () => void }) {
  const ack = useAck()
  const done = () => {
    ack()
    onClose()
  }
  if (kind === 'confirm') return <ConfirmDialog po={po} author={ctx.author} onDone={done} onClose={onClose} />
  if (kind === 'estimate') return <EstimateDialog po={po} author={ctx.author} onDone={done} onClose={onClose} />
  if (kind === 'ship') return <ShipDialog po={po} author={ctx.author} onDone={done} onClose={onClose} />
  return <ChangeDialog po={po} author={ctx.author} from="supplier" onDone={done} onClose={onClose} />
}

function useDialog() {
  const [d, setD] = useState<{ kind: DialogKind; po: PurchaseOrder } | null>(null)
  return { d, open: (kind: DialogKind, po: PurchaseOrder) => setD({ kind, po }), close: () => setD(null) }
}

/* ------------------------------------------------------------------ PIC card */
function PicCard({ supplierId }: { supplierId: string }) {
  const pic = SUPPLIER_PIC[supplierId]
  const toast = useToast()
  return (
    <section className="rounded-2xl border bg-surface p-5">
      <div className="text-xs font-semibold tracking-wide text-fg-muted uppercase">Kontak Anda di Paragon</div>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">SM</span>
        <div>
          <div className="text-[15px] font-semibold text-fg">{pic.name}</div>
          <div className="text-xs text-fg-muted">{pic.title} · biasanya membalas &lt; 2 jam</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => toast({ title: 'Demo: membuka WhatsApp', body: `Di versi nyata, tombol ini membuka chat WhatsApp dengan ${pic.name}.` })}>
          <MessageCircle /> WhatsApp
        </Button>
        <Button variant="outline" size="sm" onClick={() => toast({ title: 'Demo: panggilan telepon', body: 'Nomor kontak ditampilkan di versi nyata.' })}>
          <Phone /> Telepon
        </Button>
      </div>
      <div className="mt-3 border-t pt-3 text-xs text-fg-muted">Dokumen halal & mutu: {pic.qa}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ Check-in card (answer in one tap) */
function CheckinCard({ poId, sentAt, ctx, onEstimate, onShip }: { poId: string; sentAt: string; ctx: Ctx; onEstimate: (po: PurchaseOrder) => void; onShip: (po: PurchaseOrder) => void }) {
  const ack = useAck()
  const po = poById(poId)
  const m = materialById(po.materialId)
  return (
    <div className="rounded-2xl border-2 border-brand/40 bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="info" icon={Timer}>Paragon minta update progres</Chip>
        <span className="text-xs text-fg-subtle">dikirim {sentAt}</span>
      </div>
      <div className="mt-2 text-lg font-semibold text-fg">{m.name} · {fmt(po.confirmedQty ?? po.qty)} {m.unit}</div>
      <div className="text-sm text-fg-muted"><Mono className="text-[13px]">{po.id}</Mono> · ETA {po.eta ?? po.needDate}</div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Button size="lg" className="h-12 bg-teal text-[14px] hover:bg-teal/90" onClick={() => { collab.answerCheckin(po.id, 'sesuai', ctx.author); ack('Terima kasih, update terkirim') }}>
          <Check /> Sesuai jadwal
        </Button>
        <Button size="lg" variant="outline" className="h-12 text-[14px]" onClick={() => onEstimate(po)}>
          <RefreshCw /> Perlu perbarui estimasi
        </Button>
        <Button size="lg" variant="outline" className="h-12 text-[14px]" onClick={() => onShip(po)}>
          <PackageCheck /> Sudah dikirim
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Orders (home) */
function Orders({ ctx }: { ctx: Ctx }) {
  const s = useCollab()
  const ack = useAck()
  const dlg = useDialog()
  const scope = supplierScope(ctx.supplierId)
  const myPoIds = new Set(scope.pos.map((p) => p.id))
  const checkins = s.checkins.filter((c) => myPoIds.has(c.poId) && !c.answer && poById(c.poId).status !== 'Diterbitkan')
  const pending = scope.pos.filter((p) => p.status === 'Diterbitkan')
  const active = scope.pos.filter((p) => p.status !== 'Diterbitkan' && p.status !== 'Diterima')
  const paragonChanges = s.changes.filter((c) => myPoIds.has(c.poId) && c.from === 'paragon' && c.status === 'Diajukan')
  const docsMissing = scope.materials.map((m) => docsFor(m.id, s)).filter((d) => d.missing)
  const todo = checkins.length + pending.filter((p) => !s.confirmations[p.id]).length + paragonChanges.length

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-10">
        <section>
          <h2 className="text-[22px] font-semibold tracking-tight text-fg">{todo ? `${todo} hal menunggu jawaban Anda` : 'Semua sudah dijawab — terima kasih!'}</h2>
          <p className="mt-1 text-[15px] text-fg-muted">Jawab singkat saja. Kabar lebih awal membantu kami mencari solusi bersama.</p>

          <div className="mt-5 space-y-3">
            {checkins.map((c) => <CheckinCard key={c.id} poId={c.poId} sentAt={c.sentAt} ctx={ctx} onEstimate={(po) => dlg.open('estimate', po)} onShip={(po) => dlg.open('ship', po)} />)}

            {pending.map((po) => {
              const m = materialById(po.materialId)
              const done = s.confirmations[po.id]
              return (
                <div key={po.id} className={cn('flex flex-col gap-4 rounded-2xl border-2 bg-surface p-5 sm:flex-row sm:items-center', done ? 'border-teal/30' : 'border-teal')}>
                  <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', done ? 'bg-teal-soft text-teal' : 'bg-teal text-white')}>
                    {done ? <CheckCircle2 className="size-6" /> : <Package className="size-6" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Mono className="text-sm font-semibold">{po.id}</Mono>
                      {done ? <Chip tone="teal" icon={CheckCircle2}>Terkirim (simulasi)</Chip> : <Chip tone="warning" icon={AlarmClock}>Batas {po.confirmDeadline}</Chip>}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-fg">PO baru: {m.name} · {fmt(po.qty)} {m.unit}</div>
                    <div className="mt-0.5 text-sm text-fg-muted">
                      {done
                        ? done.able === 'tidak'
                          ? `Anda menyatakan tidak sanggup · ${done.reason}`
                          : `Jadwal kirim: ${done.deliveries.map((d) => `${fmt(d.qty)} (${d.date})`).join(' + ')}`
                        : `Dibutuhkan ${po.needDate} · boleh dikonfirmasi sebagian atau dikirim bertahap`}
                    </div>
                  </div>
                  {!done && (
                    <Button size="lg" className="h-12 bg-teal px-6 text-[15px] hover:bg-teal/90" onClick={() => dlg.open('confirm', po)}>
                      Konfirmasi <ArrowRight />
                    </Button>
                  )}
                </div>
              )
            })}

            {paragonChanges.map((c) => (
              <div key={c.id} className="rounded-2xl border-2 border-warning/40 bg-surface p-5">
                <Chip tone="warning" icon={ArrowLeftRight}>Paragon mengajukan perubahan</Chip>
                <div className="mt-2 text-[15px] font-semibold text-fg"><Mono className="text-sm">{c.poId}</Mono> · {c.summary}</div>
                <div className="text-sm text-fg-muted">Alasan: {c.reason}</div>
                <div className="mt-3 flex gap-2">
                  <Button className="bg-teal hover:bg-teal/90" onClick={() => { collab.decideChange(c.id, 'Disetujui', ctx.author, 'supplier'); ack('Perubahan disetujui') }}><Check /> Setuju</Button>
                  <Button variant="outline" onClick={() => { collab.decideChange(c.id, 'Ditolak', ctx.author, 'supplier'); ack('Jawaban terkirim') }}><X /> Tidak bisa</Button>
                  <Button variant="ghost" asChild><Link to={`/supplier/po/${c.poId}`}>Diskusikan</Link></Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fg">Pesanan berjalan</h2>
          <div className="mt-4 space-y-3">
            {active.map((po) => {
              const m = materialById(po.materialId)
              const ship = s.shipments[po.id]
              const last = [...s.messages].reverse().find((x) => x.poId === po.id && x.from !== 'system')
              return (
                <article key={po.id} className="rounded-2xl border bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Mono className="text-sm font-semibold text-fg">{po.id}</Mono>
                        {ship ? <Chip tone="teal" icon={PackageCheck}>Dikirim {ship.date}</Chip> : <POStatusBadge po={po} />}
                      </div>
                      <h3 className="mt-1 text-lg font-semibold text-fg">{m.name}</h3>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-fg-muted">Anda konfirmasi</div>
                      <div className="tnum text-lg font-semibold text-fg">{fmt(po.confirmedQty ?? 0)} <span className="text-sm font-normal text-fg-subtle">/ {fmt(po.qty)} {m.unit}</span></div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-fg-muted">ETA {po.eta} · dibutuhkan {po.needDate}</div>
                  {last && (
                    <Link to={`/supplier/po/${po.id}`} className="mt-3 flex items-start gap-2 rounded-lg bg-sunken px-3 py-2 text-[13px] text-fg-muted hover:text-fg">
                      <MessageSquareText className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
                      <span className="line-clamp-2"><span className="font-medium text-fg">{last.author}:</span> {last.text}</span>
                    </Link>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => dlg.open('estimate', po)}><RefreshCw /> Perbarui estimasi</Button>
                    {!ship && <Button size="sm" variant="outline" onClick={() => dlg.open('ship', po)}><PackageCheck /> Sudah dikirim</Button>}
                    <Button size="sm" variant="outline" onClick={() => dlg.open('change', po)}><ArrowLeftRight /> Ajukan perubahan</Button>
                    <Button size="sm" variant="ghost" className="text-teal" asChild><Link to={`/supplier/po/${po.id}`}>Buka percakapan <ArrowRight /></Link></Button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <PicCard supplierId={ctx.supplierId} />
        {docsMissing.length > 0 && (
          <Link to="/supplier/dokumen" className="block rounded-2xl border border-warning/30 bg-warning-soft/50 p-5 transition-colors hover:bg-warning-soft">
            <div className="flex items-center gap-2 text-sm font-semibold text-fg"><FileCheck2 className="size-4 text-warning" /> {docsMissing.length} dokumen perlu dilengkapi</div>
            <p className="mt-1 text-[13px] text-fg-muted">{docsMissing.map((d) => d.missing).join(', ')}.</p>
            <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-teal">Lengkapi <ArrowRight className="size-3.5" /></span>
          </Link>
        )}
        <section className="rounded-2xl border bg-surface p-5 text-[13px] text-fg-muted">
          <div className="mb-2 text-xs font-semibold tracking-wide uppercase">Tips</div>
          Ada kendala? Konfirmasi sebagian atau perbarui estimasi lebih awal. Melapor lebih awal <span className="font-medium text-fg">tidak mengurangi</span> penilaian Anda.
        </section>
      </aside>

      {dlg.d && <ActionDialog kind={dlg.d.kind} po={dlg.d.po} ctx={ctx} onClose={dlg.close} />}
    </div>
  )
}

/* ------------------------------------------------------------------ PO detail with conversation */
function PoDetail({ ctx }: { ctx: Ctx }) {
  const { poId } = useParams()
  const location = useLocation()
  const fromWa = (location.state as { fromWa?: boolean } | null)?.fromWa
  const s = useCollab()
  const ack = useAck()
  const dlg = useDialog()
  const po = supplierScope(ctx.supplierId).pos.find((p) => p.id === poId)
  if (!po) return <Navigate to="/supplier" replace />
  const m = materialById(po.materialId)
  const conf = s.confirmations[po.id]
  const ship = s.shipments[po.id]
  const changes = s.changes.filter((c) => c.poId === po.id)
  const openCheckin = po.status !== 'Diterbitkan' ? s.checkins.find((c) => c.poId === po.id && !c.answer) : undefined

  return (
    <div className="space-y-6">
      {fromWa && (
        <div className="flex items-start gap-2 rounded-xl border border-teal/30 bg-teal-soft px-4 py-3 text-sm text-fg">
          <MessageCircle className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
          Dibuka dari tautan WhatsApp — langsung ke pesanan ini tanpa login. <span className="text-fg-muted">(Simulasi)</span>
        </div>
      )}
      <Link to="/supplier" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> Pesanan Saya</Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          {openCheckin && <CheckinCard poId={po.id} sentAt={openCheckin.sentAt} ctx={ctx} onEstimate={(p) => dlg.open('estimate', p)} onShip={(p) => dlg.open('ship', p)} />}
          <section className="rounded-2xl border bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Mono className="text-sm font-semibold">{po.id}</Mono>
              {ship ? <Chip tone="teal" icon={PackageCheck}>Dikirim {ship.date}</Chip> : conf ? <Chip tone="teal" icon={CheckCircle2}>Terkonfirmasi (simulasi)</Chip> : <POStatusBadge po={po} />}
            </div>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-fg">{m.name}</h2>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-fg-muted">Qty pesanan</dt><dd className="tnum mt-0.5 font-semibold">{fmt(po.qty)} {m.unit}</dd></div>
              <div><dt className="text-xs text-fg-muted">Anda konfirmasi</dt><dd className="tnum mt-0.5 font-semibold">{conf ? fmt(conf.deliveries.reduce((a, d) => a + d.qty, 0)) : po.confirmedQty != null ? fmt(po.confirmedQty) : '—'}</dd></div>
              <div><dt className="text-xs text-fg-muted">Dibutuhkan</dt><dd className="mt-0.5 font-semibold">{po.needDate}</dd></div>
              <div><dt className="text-xs text-fg-muted">ETA</dt><dd className="mt-0.5 font-semibold">{conf?.deliveries[0]?.date ?? po.eta ?? '—'}</dd></div>
            </dl>
            {conf && conf.deliveries.length > 1 && (
              <div className="mt-4 rounded-lg bg-sunken px-3 py-2 text-[13px] text-fg-muted">Kirim bertahap: {conf.deliveries.map((d) => `${fmt(d.qty)} ${m.unit} (${d.date})`).join(' · ')}</div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {po.status === 'Diterbitkan' && !conf ? (
                <Button className="bg-teal hover:bg-teal/90" onClick={() => dlg.open('confirm', po)}>Konfirmasi pesanan <ArrowRight /></Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => dlg.open('estimate', po)}><RefreshCw /> Perbarui estimasi</Button>
                  {!ship && po.status !== 'Diterbitkan' && <Button variant="outline" onClick={() => dlg.open('ship', po)}><PackageCheck /> Sudah dikirim</Button>}
                </>
              )}
              <Button variant="outline" onClick={() => dlg.open('change', po)}><ArrowLeftRight /> Ajukan perubahan</Button>
            </div>
          </section>

          {changes.length > 0 && (
            <section className="rounded-2xl border bg-surface p-5">
              <h3 className="text-[15px] font-semibold text-fg">Permintaan perubahan</h3>
              <ul className="mt-3 divide-y">
                {changes.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                    <Mono className="text-xs text-fg-muted">{c.id}</Mono>
                    <span className="min-w-0 flex-1 text-fg">{c.summary} <span className="text-fg-muted">· dari {c.from === 'supplier' ? 'Anda' : 'Paragon'}</span></span>
                    {c.status === 'Diajukan' && c.from === 'paragon' ? (
                      <span className="flex gap-1.5">
                        <Button size="sm" className="bg-teal hover:bg-teal/90" onClick={() => { collab.decideChange(c.id, 'Disetujui', ctx.author, 'supplier'); ack('Perubahan disetujui') }}>Setuju</Button>
                        <Button size="sm" variant="outline" onClick={() => { collab.decideChange(c.id, 'Ditolak', ctx.author, 'supplier'); ack('Jawaban terkirim') }}>Tidak bisa</Button>
                      </span>
                    ) : (
                      <Chip tone={c.status === 'Disetujui' ? 'success' : c.status === 'Ditolak' ? 'danger' : 'info'}>{c.status === 'Diajukan' ? 'Ditinjau Paragon' : c.status}</Chip>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section className="rounded-2xl border bg-surface p-5">
          <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-fg"><MessageSquareText className="size-4 text-teal" /> Percakapan dengan Paragon</h3>
          <Thread poId={po.id} viewer="supplier" author={ctx.author} quickReplies={['Baik, kami cek dulu', 'Bisa kirim sebagian lebih awal', 'Mohon info lebih lanjut']} />
        </section>
      </div>
      {dlg.d && <ActionDialog kind={dlg.d.kind} po={dlg.d.po} ctx={ctx} onClose={dlg.close} />}
    </div>
  )
}

/* ------------------------------------------------------------------ Shell */
export function SupplierPortal({ user }: { user: DemoUser }) {
  const supplier = supplierById(user.supplierId!)
  const location = useLocation()
  const blocked = (location.state as { blocked?: string } | null)?.blocked
  const [dismissed, setDismissed] = useState(false)
  const s = useCollab()
  const ctx: Ctx = { user, supplierId: supplier.id, author: `${user.name.split(' ')[0]} · ${supplier.alias}` }
  const scope = supplierScope(supplier.id)
  const myPo = new Set(scope.pos.map((p) => p.id))
  const todo =
    s.checkins.filter((c) => myPo.has(c.poId) && !c.answer && poById(c.poId).status !== 'Diterbitkan').length +
    scope.pos.filter((p) => p.status === 'Diterbitkan' && !s.confirmations[p.id]).length +
    s.changes.filter((c) => myPo.has(c.poId) && c.from === 'paragon' && c.status === 'Diajukan').length
  const docTodo = scope.materials.filter((m) => docsFor(m.id, s).missing).length

  const tabs = [
    { to: '/supplier', label: 'Pesanan Saya', icon: ClipboardList, end: false, badge: todo, match: (p: string) => p === '/supplier' || p.startsWith('/supplier/po') },
    { to: '/supplier/proyeksi', label: 'Proyeksi', icon: LineChart },
    { to: '/supplier/dokumen', label: 'Dokumen Halal & BPOM', icon: FileCheck2, badge: docTodo },
    { to: '/supplier/riwayat', label: 'Riwayat', icon: History },
  ]

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b bg-surface">
        <div className="mx-auto flex h-16 max-w-[1160px] items-center gap-4 px-4 sm:px-6">
          <Logo tone="dark" />
          <span className="hidden h-6 w-px bg-border sm:block" aria-hidden />
          <span className="hidden text-sm font-medium text-fg-muted sm:block">Portal Supplier</span>
          <span className="rounded-md border border-teal/30 bg-teal-soft px-1.5 py-0.5 text-[10px] font-bold tracking-[0.12em] text-teal">DEMO</span>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-sm font-semibold text-fg">{supplier.name}</div>
              <div className="text-xs text-fg-muted">Kode vendor {supplier.code}</div>
            </div>
            <ProfileMenu user={user} compact />
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1160px] gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Menu portal">
          {tabs.map((t) => {
            const active = t.match ? t.match(location.pathname) : location.pathname.startsWith(t.to)
            return (
              <NavLink
                key={t.to}
                to={t.to}
                className={cn('flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-[14px] font-medium transition-colors', active ? 'border-teal text-fg' : 'border-transparent text-fg-muted hover:text-fg')}
              >
                <t.icon className="size-4" aria-hidden />
                {t.label}
                {!!t.badge && <span className="rounded-full bg-teal px-1.5 text-[11px] leading-5 font-semibold text-white">{t.badge}</span>}
              </NavLink>
            )
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-[1160px] px-4 py-8 sm:px-6 sm:py-10">
        {blocked && !dismissed && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-fg" role="status">
            <ShieldOff className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            <p className="flex-1">
              Halaman <Mono className="text-[13px]">{blocked}</Mono> hanya tersedia untuk pengguna internal. Anda diarahkan kembali ke Portal Supplier.
              <span className="text-fg-muted"> (Pembatasan tampilan pada prototipe.)</span>
            </p>
            <button onClick={() => setDismissed(true)} className="text-fg-muted hover:text-fg" aria-label="Tutup pemberitahuan"><X className="size-4" /></button>
          </div>
        )}
        {!location.pathname.startsWith('/supplier/po') && (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm text-fg-muted"><CalendarDays className="size-4" aria-hidden /> Senin, 9 Nov 2026</p>
              <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.02em] text-fg">Halo, {user.name.split(' ')[0]}</h1>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-fg-subtle"><FlaskConical className="size-3.5" aria-hidden /> Data simulasi · hanya pesanan {supplier.alias}</p>
          </div>
        )}
        <Routes>
          <Route index element={<Orders ctx={ctx} />} />
          <Route path="po/:poId" element={<PoDetail ctx={ctx} />} />
          <Route path="proyeksi" element={<Projection supplierId={supplier.id} />} />
          <Route path="dokumen" element={<Documents supplierId={supplier.id} />} />
          <Route path="riwayat" element={<HistoryTab supplierId={supplier.id} />} />
          <Route path="*" element={<Navigate to="/supplier" replace />} />
        </Routes>
      </main>
    </div>
  )
}
