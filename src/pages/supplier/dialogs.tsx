import { useState, type ReactNode } from 'react'
import { FlaskConical, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { materialById } from '@/data/mock'
import type { PurchaseOrder } from '@/data/types'
import { collab, type Delivery } from '@/lib/collab-store'
import { fmt } from '@/lib/format'
import { cn } from '@/lib/utils'

export const fmtInputDate = (v: string) => new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
const TODAY = '2026-11-09'

export const CONSTRAINT_REASONS = ['Bahan baku terlambat', 'Kapasitas mesin penuh', 'Mesin rusak / perawatan', 'Tenaga kerja kurang', 'Kendala pengiriman / armada', 'Lainnya']

function SimNote() {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-xs text-warning">
      <FlaskConical className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      Simulasi: hanya tersimpan di browser ini, tidak dikirim ke SAP.
    </div>
  )
}

function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string | null; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-2 text-[13px]">{label}</Label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : hint ? <p className="mt-1.5 text-xs text-fg-subtle">{hint}</p> : null}
    </div>
  )
}

function ReasonSelect({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 w-full" aria-invalid={invalid}><SelectValue placeholder="Pilih dari daftar" /></SelectTrigger>
      <SelectContent>{CONSTRAINT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
    </Select>
  )
}

function Choice<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className={cn('grid gap-2', options.length === 3 ? 'grid-cols-3' : 'grid-cols-2')} role="radiogroup">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            'min-h-11 rounded-lg border px-2 text-[13.5px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
            value === v ? 'border-teal bg-teal-soft text-teal shadow-[0_0_0_1px_var(--accent-teal)]' : 'bg-surface text-fg-muted hover:bg-sunken',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ Confirm PO (full / partial with split / not able) */
export function ConfirmDialog({ po, author, onDone, onClose }: { po: PurchaseOrder; author: string; onDone: () => void; onClose: () => void }) {
  const m = materialById(po.materialId)
  const [able, setAble] = useState<'penuh' | 'sebagian' | 'tidak'>('penuh')
  const [rows, setRows] = useState<{ qty: string; date: string }[]>([{ qty: String(po.qty), date: '2026-11-26' }])
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  const parsed: Delivery[] = rows.map((r) => ({ qty: Number(r.qty.replace(/\D/g, '')), date: r.date }))
  const total = parsed.reduce((s, d) => s + d.qty, 0)
  const err =
    able === 'tidak'
      ? null
      : parsed.some((d) => !d.qty) ? 'Isi qty untuk setiap pengiriman.'
      : parsed.some((d) => !d.date || d.date < TODAY) ? 'Tanggal tidak boleh kosong atau sudah lewat.'
      : total > po.qty ? `Total ${fmt(total)} melebihi qty PO (${fmt(po.qty)} ${m.unit}).`
      : able === 'penuh' && total !== po.qty ? `Sanggup penuh berarti total ${fmt(po.qty)} ${m.unit}.`
      : able === 'sebagian' && total === po.qty ? 'Total sama dengan PO — pilih "Sanggup penuh".'
      : null
  const reasonErr = able !== 'penuh' && !reason ? 'Pilih alasan dari daftar.' : null

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Konfirmasi {po.id}</DialogTitle>
          <DialogDescription>{m.name} · {fmt(po.qty)} {m.unit} · dibutuhkan {po.needDate}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            if (err || reasonErr) return
            collab.confirm({ poId: po.id, able, deliveries: able === 'tidak' ? [] : parsed.map((d) => ({ qty: d.qty, date: fmtInputDate(d.date) })), reason: reason || undefined }, author)
            onDone()
          }}
        >
          <Field label="1. Apakah Anda sanggup?">
            <Choice value={able} onChange={(v) => { setAble(v); if (v === 'penuh') setRows([{ qty: String(po.qty), date: rows[0].date }]) }} options={[['penuh', 'Sanggup penuh'], ['sebagian', 'Sebagian'], ['tidak', 'Tidak sanggup']]} />
          </Field>
          {able !== 'tidak' && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-[13px]">2. Jadwal kirim ({m.unit})</Label>
                <span className="tnum text-xs text-fg-muted">Total {fmt(total)} / {fmt(po.qty)}</span>
              </div>
              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_36px] items-center gap-2">
                    <Input inputMode="numeric" aria-label={`Qty pengiriman ${i + 1}`} value={r.qty} onChange={(e) => setRows((s) => s.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} className="tnum h-11" />
                    <Input type="date" min={TODAY} aria-label={`Tanggal pengiriman ${i + 1}`} value={r.date} onChange={(e) => setRows((s) => s.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} className="h-11" />
                    {rows.length > 1 ? (
                      <Button type="button" variant="ghost" size="icon" aria-label="Hapus pengiriman" onClick={() => setRows((s) => s.filter((_, j) => j !== i))}><Trash2 /></Button>
                    ) : <span />}
                  </div>
                ))}
              </div>
              <Button type="button" variant="ghost" size="sm" className="mt-1 text-teal" onClick={() => setRows((s) => [...s, { qty: '', date: s[s.length - 1].date }])}>
                <Plus /> Kirim bertahap (tambah tanggal)
              </Button>
              {touched && err && <p className="mt-1 text-xs text-danger">{err}</p>}
              <p className="mt-1 text-xs text-fg-subtle">Isi jumlah yang benar-benar bisa Anda produksi. Konfirmasi sebagian lebih baik daripada terlambat.</p>
            </div>
          )}
          {able !== 'penuh' && (
            <Field label="Alasan kendala" error={touched ? reasonErr : null}>
              <ReasonSelect value={reason} onChange={setReason} invalid={touched && !!reasonErr} />
            </Field>
          )}
          <SimNote />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" className="bg-teal hover:bg-teal/90">Kirim konfirmasi</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ Update estimate (neutral wording, presets) */
const ESTIMATE_PRESETS = ['Mundur beberapa hari', 'Bisa kirim sebagian dulu', 'Bahan baku terlambat', 'Kapasitas mesin penuh', 'Lainnya']

export function EstimateDialog({ po, author, onDone, onClose }: { po: PurchaseOrder; author: string; onDone: () => void; onClose: () => void }) {
  const m = materialById(po.materialId)
  const [preset, setPreset] = useState('')
  const [days, setDays] = useState('2')
  const [qty, setQty] = useState('')
  const [rm, setRm] = useState<'tersedia' | 'menunggu' | 'kendala'>('tersedia')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const needsDays = preset === 'Mundur beberapa hari'
  const needsQty = preset === 'Bisa kirim sebagian dulu'
  const qtyNum = Number(qty.replace(/\D/g, ''))
  const err = !preset ? 'Pilih salah satu.' : needsQty && (!qtyNum || qtyNum > po.qty) ? `Isi qty antara 1 dan ${fmt(po.qty)}.` : null
  const rmLabel = { tersedia: 'Bahan baku tersedia', menunggu: 'Bahan baku sedang dipesan', kendala: 'Bahan baku ada kendala' }[rm]

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Perbarui estimasi · {po.id}</DialogTitle>
          <DialogDescription>Memberi tahu lebih awal membantu kami mencari solusi bersama — dan menambah nilai keterbukaan Anda.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            if (err) return
            const detail = [needsDays && `Estimasi mundur ${days} hari.`, needsQty && `Bisa kirim ${fmt(qtyNum)} ${m.unit} dulu.`, `${rmLabel}.`, note].filter(Boolean).join(' ')
            collab.updateEstimate(po.id, author, preset, detail)
            onDone()
          }}
        >
          <Field label="Apa yang berubah?" error={touched && !preset ? 'Pilih salah satu.' : null}>
            <div className="grid grid-cols-2 gap-2">
              {ESTIMATE_PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => setPreset(p)} aria-pressed={preset === p}
                  className={cn('min-h-11 rounded-lg border px-3 text-left text-[13px] font-medium', preset === p ? 'border-teal bg-teal-soft text-teal' : 'text-fg-muted hover:bg-sunken')}>
                  {p}
                </button>
              ))}
            </div>
          </Field>
          {needsDays && (
            <Field label="Mundur berapa hari?" htmlFor="days">
              <Input id="days" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} className="h-11 w-32" />
            </Field>
          )}
          {needsQty && (
            <Field label={`Qty yang bisa dikirim dulu (${m.unit})`} htmlFor="pq" error={touched ? err : null}>
              <Input id="pq" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className="tnum h-11" />
            </Field>
          )}
          <Field label="Status bahan baku Anda">
            <Choice value={rm} onChange={setRm} options={[['tersedia', 'Tersedia'], ['menunggu', 'Sedang dipesan'], ['kendala', 'Ada kendala']]} />
          </Field>
          <Field label="Catatan (opsional)" htmlFor="note">
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. kertas karton tiba 18 Nov" className="h-11" />
          </Field>
          <SimNote />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" className="bg-teal hover:bg-teal/90">Kirim pembaruan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ Mark shipped (+ CoA per lot) */
export function ShipDialog({ po, author, onDone, onClose }: { po: PurchaseOrder; author: string; onDone: () => void; onClose: () => void }) {
  const m = materialById(po.materialId)
  const [qty, setQty] = useState(String(po.confirmedQty ?? po.qty))
  const [date, setDate] = useState(TODAY)
  const [sj, setSj] = useState('')
  const [lot, setLot] = useState('')
  const [coa, setCoa] = useState(false)
  const [touched, setTouched] = useState(false)
  const qtyNum = Number(qty.replace(/\D/g, ''))
  const err = !qtyNum || qtyNum > po.qty ? `Qty antara 1 dan ${fmt(po.qty)}.` : !sj.trim() ? 'Isi nomor surat jalan.' : !lot.trim() || !coa ? 'Isi nomor lot dan lampirkan CoA.' : null
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Sudah dikirim · {po.id}</DialogTitle>
          <DialogDescription>{m.name}. CoA per lot dibutuhkan agar barang bisa langsung dirilis QC (CPKB BPOM).</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            if (err) return
            collab.ship({ poId: po.id, qty: qtyNum, date: fmtInputDate(date), sj: sj.trim(), coaLot: lot.trim() }, author)
            onDone()
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Qty dikirim (${m.unit})`} htmlFor="sq"><Input id="sq" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className="tnum h-11" /></Field>
            <Field label="Tanggal kirim" htmlFor="sd"><Input id="sd" type="date" min={TODAY} value={date} onChange={(e) => setDate(e.target.value)} className="h-11" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="No. surat jalan" htmlFor="sj"><Input id="sj" value={sj} onChange={(e) => setSj(e.target.value)} placeholder="SJ-KKM-0119" className="h-11" /></Field>
            <Field label="No. lot" htmlFor="lot"><Input id="lot" value={lot} onChange={(e) => setLot(e.target.value)} placeholder="CTN-2611-16" className="h-11" /></Field>
          </div>
          <Field label="Certificate of Analysis (CoA)">
            <button type="button" onClick={() => setCoa(true)}
              className={cn('flex min-h-11 w-full items-center justify-center rounded-lg border border-dashed px-3 text-[13px] font-medium', coa ? 'border-teal bg-teal-soft text-teal' : 'text-fg-muted hover:bg-sunken')}>
              {coa ? `CoA_${lot || 'lot'}.pdf terlampir (simulasi)` : 'Lampirkan file CoA (simulasi)'}
            </button>
          </Field>
          {touched && err && <p className="text-xs text-danger">{err}</p>}
          <SimNote />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" className="bg-teal hover:bg-teal/90">Kirim info pengiriman</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ Change request (either side) */
export function ChangeDialog({ po, author, from, onDone, onClose }: { po: PurchaseOrder; author: string; from: 'supplier' | 'paragon'; onDone: () => void; onClose: () => void }) {
  const m = materialById(po.materialId)
  const [type, setType] = useState<'tanggal' | 'qty'>('tanggal')
  const [date, setDate] = useState('2026-11-24')
  const [qty, setQty] = useState(String(po.confirmedQty ?? po.qty))
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const qtyNum = Number(qty.replace(/\D/g, ''))
  const err = !reason.trim() ? 'Tuliskan alasan singkat.' : type === 'qty' && !qtyNum ? 'Isi qty.' : type === 'tanggal' && date < TODAY ? 'Tanggal sudah lewat.' : null
  const summary = type === 'tanggal' ? `Tanggal kirim menjadi ${fmtInputDate(date)}` : `Qty menjadi ${fmt(qtyNum)} ${m.unit}`
  const impact = type === 'tanggal' ? `Kedatangan ${m.name} bergeser; PPIC meninjau batch yang memakai ${m.id}.` : `Pasokan terkonfirmasi ${m.id} berubah ${fmt(qtyNum - (po.confirmedQty ?? po.qty))} ${m.unit}.`
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Ajukan perubahan · {po.id}</DialogTitle>
          <DialogDescription>{from === 'supplier' ? 'Paragon akan meninjau dan menjawab di percakapan PO.' : 'Supplier akan menerima permintaan ini di portalnya.'}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            if (err) return
            collab.proposeChange({ poId: po.id, from, author, summary, qty: type === 'qty' ? qtyNum : undefined, date: type === 'tanggal' ? fmtInputDate(date) : undefined, reason: reason.trim(), impact })
            onDone()
          }}
        >
          <Choice value={type} onChange={setType} options={[['tanggal', 'Ubah tanggal'], ['qty', 'Ubah qty']]} />
          {type === 'tanggal' ? (
            <Field label="Tanggal baru" htmlFor="cd"><Input id="cd" type="date" min={TODAY} value={date} onChange={(e) => setDate(e.target.value)} className="h-11" /></Field>
          ) : (
            <Field label={`Qty baru (${m.unit})`} htmlFor="cq"><Input id="cq" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className="tnum h-11" /></Field>
          )}
          <Field label="Alasan" htmlFor="cr" error={touched ? err : null}><Input id="cr" value={reason} onChange={(e) => setReason(e.target.value)} className="h-11" /></Field>
          <SimNote />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit">Ajukan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ Material change notification (halal / BPOM) */
const NOTICE_TYPES = ['Ganti pemasok bahan baku', 'Ganti tinta / lem / pelapis', 'Ganti lokasi produksi', 'Ubah komposisi / spesifikasi']

export function NoticeDialog({ materials, supplierId, onDone, onClose }: { materials: { id: string; name: string }[]; supplierId: string; onDone: () => void; onClose: () => void }) {
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? '')
  const [what, setWhat] = useState('')
  const [detail, setDetail] = useState('')
  const [touched, setTouched] = useState(false)
  const err = !what ? 'Pilih jenis perubahan.' : !detail.trim() ? 'Jelaskan singkat perubahannya.' : null
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Pemberitahuan perubahan bahan</DialogTitle>
          <DialogDescription>Beri tahu kami sebelum mengirim barang dengan bahan atau sumber baru, supaya status halal & BPOM tetap aman.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            if (err) return
            collab.submitNotice({ materialId, supplierId, what, detail: detail.trim() })
            onDone()
          }}
        >
          <Field label="Material">
            <Select value={materialId} onValueChange={setMaterialId}>
              <SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.id} · {m.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Jenis perubahan">
            <Select value={what} onValueChange={setWhat}>
              <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Pilih dari daftar" /></SelectTrigger>
              <SelectContent>{NOTICE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Penjelasan singkat" htmlFor="nd" error={touched ? err : null}>
            <Input id="nd" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="mis. lem karton ganti merek mulai Desember" className="h-11" />
          </Field>
          <SimNote />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" className="bg-teal hover:bg-teal/90">Kirim pemberitahuan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
