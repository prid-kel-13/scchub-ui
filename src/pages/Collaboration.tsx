import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowLeftRight, Check, ExternalLink, FlaskConical, Inbox, MessageCircle, RotateCw, Send, Timer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Thread } from '@/components/shared/Thread'
import { useToast } from '@/components/shared/Toast'
import { Chip, DataTable, Mono, PageHeader, Panel, POStatusBadge, SimTag, Td, Th } from '@/components/shared/ui-kit'
import type { CheckinAnswer } from '@/data/collab'
import { PURCHASE_ORDERS, dayIndex, etaSlip, materialById, poById, supplierById } from '@/data/mock'
import { collab, useCollab } from '@/lib/collab-store'
import { fmt } from '@/lib/format'
import { accessFor } from '@/lib/nav'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'
import { ChangeDialog } from '@/pages/supplier/dialogs'

const AUTHOR = 'Sinta · Procurement'
const OPEN = PURCHASE_ORDERS.filter((p) => p.status !== 'Diterima')
const inHorizon = (d: string | null) => !!d && dayIndex(d) - 31 <= 23
const atRisk = (id: string) => {
  const p = poById(id)
  return !!p.partial || p.status === 'Diterbitkan' || etaSlip(p) > 0
}

const ANSWER: Record<CheckinAnswer, { label: string; tone: 'success' | 'warning' | 'teal' }> = {
  sesuai: { label: 'Sesuai jadwal', tone: 'success' },
  perbarui: { label: 'Perlu perbarui estimasi', tone: 'warning' },
  dikirim: { label: 'Sudah dikirim', tone: 'teal' },
}

/* ------------------------------------------------------------------ Tab 1: check-in broadcast + board */
function CheckinTab({ canManage }: { canManage: boolean }) {
  const s = useCollab()
  const toast = useToast()
  const candidates = OPEN.filter((p) => p.status !== 'Dikirim' && (p.status === 'Diterbitkan' || inHorizon(p.eta ?? p.needDate)))
  const [sel, setSel] = useState<Set<string>>(() => new Set(candidates.filter((p) => atRisk(p.id) || inHorizon(p.eta)).map((p) => p.id)))
  const [preview, setPreview] = useState(false)
  const suppliers = Array.from(new Set([...sel].map((id) => poById(id).supplierId)))
  const rounds = Array.from(new Set(s.checkins.map((c) => c.round)))
  const latest = rounds[0]
  const board = s.checkins.filter((c) => c.round === latest)
  const answered = board.filter((c) => c.answer).length

  const toggle = (id: string) => setSel((x) => { const n = new Set(x); if (n.has(id)) n.delete(id); else n.add(id); return n })

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <Panel
        title="Minta update progres"
        description="PO yang jatuh tempo dalam 14 hari atau berisiko sudah dipilih otomatis. Supplier menjawab dengan satu ketukan dari WhatsApp."
        className="xl:col-span-7"
        icon={Timer}
        bodyClassName="pb-4"
      >
        <ul className="-mx-2 divide-y">
          {candidates.map((p) => {
            const m = materialById(p.materialId)
            const sup = supplierById(p.supplierId)
            return (
              <li key={p.id}>
                <label className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-sunken', !canManage && 'cursor-default')}>
                  <input type="checkbox" className="size-4 accent-[var(--accent-teal)]" checked={sel.has(p.id)} onChange={() => toggle(p.id)} disabled={!canManage} aria-label={`Pilih ${p.id}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium text-fg">{sup.alias} · {m.name}</div>
                    <div className="text-xs text-fg-muted"><Mono className="text-xs">{p.id}</Mono> · {p.eta ? `ETA ${p.eta.replace(' 2026', '')}` : `batas konfirmasi ${p.confirmDeadline}`} · {sup.channel}</div>
                  </div>
                  {atRisk(p.id) && <Chip tone="warning">Berisiko</Chip>}
                  <POStatusBadge po={p} />
                </label>
              </li>
            )
          })}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
          <Button disabled={!canManage || sel.size === 0} onClick={() => setPreview(true)} className="bg-teal hover:bg-teal/90">
            <Send /> Kirim ke {suppliers.length} supplier ({sel.size} PO)
          </Button>
          {!canManage && <span className="text-xs text-fg-muted">Hanya Procurement yang dapat mengirim.</span>}
          <span className="ml-auto flex items-center gap-1.5 text-xs text-fg-subtle"><FlaskConical className="size-3.5" /> Pengiriman WhatsApp disimulasikan</span>
        </div>
      </Panel>

      <Panel title="Jawaban supplier" description={latest ? `Putaran ${latest} · ${answered}/${board.length} sudah menjawab` : 'Belum ada putaran'} className="xl:col-span-5" icon={Inbox}>
        <ul className="divide-y">
          {board.map((c) => {
            const p = poById(c.poId)
            const sup = supplierById(c.supplierId)
            return (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium text-fg">{sup.alias} · {materialById(p.materialId).name}</div>
                  <div className="truncate text-xs text-fg-muted"><Mono className="text-xs">{c.poId}</Mono> · {c.answer ? `${c.answeredAt}${c.note ? ` · ${c.note}` : ''}` : `dikirim ${c.sentAt}`}</div>
                </div>
                {c.answer ? (
                  <Chip tone={ANSWER[c.answer].tone}>{ANSWER[c.answer].label}</Chip>
                ) : canManage ? (
                  <Button size="sm" variant="outline" onClick={() => toast({ title: 'Pengingat dikirim ulang (simulasi)', body: `${sup.name} · ${c.poId}. Bila tetap tidak ada jawaban 24 jam, PIC menelepon langsung.` })}>
                    <RotateCw /> Ingatkan
                  </Button>
                ) : (
                  <Chip>Menunggu</Chip>
                )}
              </li>
            )
          })}
        </ul>
        {board.some((c) => c.supplierId === 'SUP-A' && !c.answer) && (
          <div className="mt-3 rounded-lg bg-sunken px-3 py-2.5 text-xs text-fg-muted">
            Demo: lihat sisi supplier lewat tautan{' '}
            <Link className="font-medium text-teal underline-offset-2 hover:underline" to={`/wa/${board.find((c) => c.supplierId === 'SUP-A' && !c.answer)!.poId}`}>WhatsApp Joko <ExternalLink className="inline size-3" /></Link>
          </div>
        )}
      </Panel>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Pratinjau pesan WhatsApp</DialogTitle>
            <DialogDescription>Setiap supplier menerima pesan berisi tautan langsung ke PO-nya — tanpa login.</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-teal-soft p-4">
            <div className="max-w-[90%] rounded-xl rounded-tl-sm bg-surface px-3.5 py-2.5 text-[13.5px] text-fg shadow-sm">
              Halo Pak/Bu, ini Sinta dari Paragon 🙏<br />
              Boleh minta kabar progres pesanan <b>{poById([...sel][0] ?? 'PO-04571').id}</b>? Cukup pilih satu jawaban di tautan berikut:
              <div className="mt-1.5 font-medium text-brand underline">scchub.demo/wa/{[...sel][0] ?? 'PO-04571'}</div>
              <div className="mt-1 text-right text-[10.5px] text-fg-subtle">08:15</div>
            </div>
          </div>
          <p className="text-xs text-fg-muted">Dikirim ke: {suppliers.map((id) => supplierById(id).alias).join(', ')}. Pengingat otomatis setelah 24 jam tanpa jawaban.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(false)}>Batal</Button>
            <Button className="bg-teal hover:bg-teal/90" onClick={() => {
              collab.sendCheckins([...sel])
              setPreview(false)
              toast({ title: `Permintaan terkirim ke ${suppliers.length} supplier`, body: 'Jawaban akan muncul di papan "Jawaban supplier" (simulasi).' })
            }}>
              <Send /> Kirim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ Tab 2: inbox per PO */
function InboxTab({ canManage }: { canManage: boolean }) {
  const s = useCollab()
  const toast = useToast()
  const threads = useMemo(() => {
    const ids = Array.from(new Set(s.messages.map((m) => m.poId)))
    return ids
      .map((id) => {
        const msgs = s.messages.filter((m) => m.poId === id && m.from !== 'system')
        const last = msgs[msgs.length - 1]
        return { id, last, needsReply: last?.from === 'supplier' }
      })
      .filter((t) => t.last)
      .sort((a, b) => Number(b.needsReply) - Number(a.needsReply))
  }, [s.messages])
  const [active, setActive] = useState(threads[0]?.id ?? 'PO-04567')
  const [change, setChange] = useState(false)
  const po = poById(active)
  const m = materialById(po.materialId)

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <Panel title="Percakapan per PO" description={`${threads.filter((t) => t.needsReply).length} perlu dibalas`} className="xl:col-span-4" bodyClassName="px-2 pb-2">
        <ul className="space-y-1">
          {threads.map((t) => {
            const p = poById(t.id)
            return (
              <li key={t.id}>
                <button onClick={() => setActive(t.id)} className={cn('w-full rounded-lg px-3 py-2.5 text-left transition-colors', active === t.id ? 'bg-brand-soft ring-1 ring-brand/25' : 'hover:bg-sunken')}>
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13.5px] font-medium text-fg">{supplierById(p.supplierId).alias} · {materialById(p.materialId).name}</span>
                    {t.needsReply && <span className="ml-auto size-2 shrink-0 rounded-full bg-teal" aria-label="Perlu dibalas" />}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-fg-muted"><Mono className="text-xs">{t.id}</Mono> · {t.last.text}</div>
                </button>
              </li>
            )
          })}
        </ul>
      </Panel>
      <Panel
        title={<><Mono className="text-[14px]">{po.id}</Mono> · {supplierById(po.supplierId).name}</>}
        description={`${m.name} · ${fmt(po.qty)} ${m.unit} · ETA ${po.eta ?? '—'}`}
        className="xl:col-span-8"
        actions={canManage ? <Button size="sm" variant="outline" onClick={() => setChange(true)}><ArrowLeftRight /> Ajukan perubahan</Button> : undefined}
      >
        <Thread poId={po.id} viewer="paragon" author={AUTHOR} readOnly={!canManage}
          quickReplies={['Terima kasih sudah mengabari lebih awal', 'Bisa kirim sebagian lebih dulu?', 'Kami bantu carikan solusi, mohon tunggu']} />
      </Panel>
      {change && (
        <ChangeDialog po={po} author={AUTHOR} from="paragon" onClose={() => setChange(false)}
          onDone={() => { setChange(false); toast({ title: 'Permintaan perubahan dikirim', body: 'Supplier menerima permintaan ini di portalnya (simulasi).' }) }} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ Tab 3: change requests */
function ChangesTab({ canManage }: { canManage: boolean }) {
  const s = useCollab()
  const toast = useToast()
  return (
    <Panel title="Permintaan perubahan" description="Perubahan qty, tanggal, atau pengiriman bertahap — dari supplier maupun Paragon" bodyClassName="pb-1" icon={ArrowLeftRight}>
      <DataTable minWidth={900}>
        <thead><tr><Th>ID</Th><Th>PO</Th><Th>Dari</Th><Th>Perubahan</Th><Th>Dampak (internal)</Th><Th>Status</Th><Th /></tr></thead>
        <tbody>
          {s.changes.map((c) => (
            <tr key={c.id} className="hover:bg-sunken">
              <Td><Mono>{c.id}</Mono></Td>
              <Td><Mono>{c.poId}</Mono><div className="text-xs text-fg-subtle">{supplierById(poById(c.poId).supplierId).alias}</div></Td>
              <Td className="whitespace-nowrap text-fg-muted">{c.author}</Td>
              <Td><div className="font-medium text-fg">{c.summary}</div><div className="text-xs text-fg-muted">{c.reason}</div></Td>
              <Td className="max-w-[260px] text-xs text-fg-muted">{c.impact}</Td>
              <Td><Chip tone={c.status === 'Disetujui' ? 'success' : c.status === 'Ditolak' ? 'danger' : 'info'}>{c.status === 'Diajukan' ? (c.from === 'paragon' ? 'Menunggu supplier' : 'Perlu keputusan') : c.status}</Chip></Td>
              <Td>
                {canManage && c.from === 'supplier' && c.status === 'Diajukan' && (
                  <span className="flex gap-1.5">
                    <Button size="icon-sm" variant="outline" aria-label="Setujui" onClick={() => { collab.decideChange(c.id, 'Disetujui', AUTHOR, 'paragon'); toast({ title: `${c.id} disetujui`, body: 'Supplier diberi tahu di percakapan PO. Ubah PO di SAP secara manual (simulasi).' }) }}><Check /></Button>
                    <Button size="icon-sm" variant="outline" aria-label="Tolak" onClick={() => { collab.decideChange(c.id, 'Ditolak', AUTHOR, 'paragon'); toast({ title: `${c.id} ditolak`, body: 'Jelaskan alasannya di percakapan PO.' }) }}><X /></Button>
                  </span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </Panel>
  )
}

export function Collaboration() {
  const { user } = useSession()
  const [params, setParams] = useSearchParams()
  const access = user ? accessFor(user.id, 'collab') : null
  const canManage = access === 'Kelola'
  const s = useCollab()
  const tab = params.get('tab') ?? 'update'
  const pendingChanges = s.changes.filter((c) => c.status === 'Diajukan' && c.from === 'supplier').length
  const unread = Array.from(new Set(s.messages.map((m) => m.poId))).filter((id) => {
    const msgs = s.messages.filter((m) => m.poId === id && m.from !== 'system')
    return msgs[msgs.length - 1]?.from === 'supplier'
  }).length

  return (
    <>
      <PageHeader
        title="Supplier Collaboration"
        description="Koordinasi dengan supplier dalam satu tempat: minta update progres, percakapan per PO, dan permintaan perubahan — menggantikan rantai WhatsApp yang tercecer."
        meta={<>{access && <Chip tone="info">Akses Anda: {access}</Chip>}<SimTag /><Chip icon={MessageCircle}>WhatsApp disimulasikan</Chip></>}
      />
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="gap-5">
        <TabsList className="h-9">
          <TabsTrigger value="update" className="px-3">Minta Update</TabsTrigger>
          <TabsTrigger value="inbox" className="px-3">Percakapan {unread > 0 && <span className="ml-1 rounded-full bg-teal px-1.5 text-[10.5px] text-white">{unread}</span>}</TabsTrigger>
          <TabsTrigger value="changes" className="px-3">Permintaan Perubahan {pendingChanges > 0 && <span className="ml-1 rounded-full bg-warning px-1.5 text-[10.5px] text-white">{pendingChanges}</span>}</TabsTrigger>
        </TabsList>
        <TabsContent value="update"><CheckinTab canManage={canManage} /></TabsContent>
        <TabsContent value="inbox"><InboxTab canManage={canManage} /></TabsContent>
        <TabsContent value="changes"><ChangesTab canManage={canManage} /></TabsContent>
      </Tabs>
    </>
  )
}
