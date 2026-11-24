import { useState } from 'react'
import { AlertTriangle, CheckCircle2, CircleSlash, FileWarning, Info, Megaphone, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/shared/Toast'
import { Chip, Mono } from '@/components/shared/ui-kit'
import { HALAL_DEADLINE, type DocStatus } from '@/data/collab'
import { supplierScope } from '@/data/mock'
import { collab, docsFor, useCollab, type DocKey } from '@/lib/collab-store'
import { cn } from '@/lib/utils'
import { NoticeDialog } from './dialogs'

export function DocStatusChip({ status }: { status: DocStatus }) {
  if (status === 'Lengkap') return <Chip tone="success" icon={CheckCircle2}>Lengkap</Chip>
  if (status === 'Tidak berlaku') return <Chip icon={CircleSlash}>Tidak wajib</Chip>
  if (status === 'Kurang') return <Chip tone="warning" icon={FileWarning}>Belum lengkap</Chip>
  if (status === 'Segera kedaluwarsa') return <Chip tone="warning" icon={AlertTriangle}>Segera kedaluwarsa</Chip>
  return <Chip tone="info" icon={Info}>Sedang ditinjau</Chip>
}

export function Documents({ supplierId }: { supplierId: string }) {
  const s = useCollab()
  const toast = useToast()
  const [notice, setNotice] = useState(false)
  const scope = supplierScope(supplierId)
  const notices = s.notices.filter((n) => n.supplierId === supplierId)

  const upload = (materialId: string, key: DocKey, label: string) => {
    collab.uploadDoc(materialId, key)
    toast({ title: `${label} terkirim`, body: 'Rani (QA Supplier) akan memeriksa dokumen Anda. Simulasi — file tidak benar-benar diunggah.' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-fg">Dokumen Halal & BPOM</h2>
          <p className="mt-1 max-w-2xl text-[15px] text-fg-muted">Dokumen per material yang Anda pasok. Dokumen lengkap membuat barang Anda bisa langsung diterima dan dirilis QC.</p>
        </div>
        <Button className="bg-teal hover:bg-teal/90" onClick={() => setNotice(true)}><Megaphone /> Beri tahu perubahan bahan</Button>
      </div>

      <div className="rounded-xl border border-brand/20 bg-brand-soft/60 px-4 py-3 text-[13px] text-fg">
        <span className="font-semibold">Info:</span> sertifikasi halal wajib untuk kosmetik mulai <span className="font-semibold">{HALAL_DEADLINE}</span>. Sertifikat halal BPJPH berlaku selama komposisi dan proses tidak berubah — karena itu, setiap perubahan bahan perlu diberitahukan.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {scope.materials.map((mat) => {
          const d = docsFor(mat.id, s)
          const rows: { key: DocKey; label: string; status: DocStatus; detail: string }[] = [
            { key: 'halal', label: 'Halal', status: d.halal.status, detail: d.halal.kind === 'Tidak wajib' ? d.halal.ref : `${d.halal.kind} · ${d.halal.validity}` },
            { key: 'msds', label: 'MSDS / pernyataan bahan', status: d.msds, detail: d.msds === 'Kurang' ? (d.missing ?? 'Belum diterima') : 'Diterima' },
            { key: 'spec', label: 'Spesifikasi teknis', status: d.spec, detail: 'Disetujui QA' },
            { key: 'coa', label: 'CoA lot terakhir', status: d.coa.status, detail: `Lot ${d.coa.lot} · ${d.coa.note}` },
          ]
          return (
            <section key={mat.id} className="rounded-2xl border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-semibold text-fg">{mat.name}</h3>
                  <div className="text-xs text-fg-muted"><Mono className="text-xs">{mat.id}</Mono> · {d.manufacturer}, {d.site}</div>
                </div>
                <DocStatusChip status={d.overall === 'Kurang' ? 'Kurang' : d.overall} />
              </div>
              <ul className="mt-4 divide-y">
                {rows.map((r) => (
                  <li key={r.key} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium text-fg">{r.label}</div>
                      <div className="truncate text-xs text-fg-muted">{r.detail}</div>
                    </div>
                    {r.status === 'Kurang' ? (
                      <Button size="sm" className="bg-teal hover:bg-teal/90" onClick={() => upload(mat.id, r.key, r.label)}><Upload /> Unggah</Button>
                    ) : (
                      <DocStatusChip status={r.status} />
                    )}
                  </li>
                ))}
              </ul>
              {d.missing && (
                <p className={cn('mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning')}>
                  Yang dibutuhkan: {d.missing}. Contoh: pernyataan bahwa tinta & lem bebas bahan hewani, dari produsen tinta/lem Anda.
                </p>
              )}
            </section>
          )
        })}
      </div>

      <section className="rounded-2xl border bg-surface p-5">
        <h3 className="text-[15px] font-semibold text-fg">Pemberitahuan perubahan yang Anda kirim</h3>
        {notices.length === 0 ? (
          <p className="mt-2 text-sm text-fg-muted">Belum ada. Gunakan tombol "Beri tahu perubahan bahan" jika Anda mengganti pemasok bahan, tinta, lem, atau lokasi produksi.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {notices.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <Mono className="text-xs text-fg-muted">{n.id}</Mono>
                <span className="min-w-0 flex-1">{n.what} · <span className="text-fg-muted">{n.detail}</span></span>
                <Chip tone={n.status === 'Disetujui' ? 'success' : n.status === 'Perlu uji ulang' ? 'warning' : 'info'}>{n.status}</Chip>
              </li>
            ))}
          </ul>
        )}
      </section>

      {notice && (
        <NoticeDialog
          materials={scope.materials}
          supplierId={supplierId}
          onClose={() => setNotice(false)}
          onDone={() => {
            setNotice(false)
            toast({ title: 'Pemberitahuan terkirim', body: 'Terima kasih sudah memberi tahu sebelum pengiriman. QA Paragon akan meninjau.' })
          }}
        />
      )}
    </div>
  )
}
