import { useState } from 'react'
import { BadgeCheck, CalendarClock, Check, FileWarning, FlaskConical, Info, Megaphone, RotateCcw, ScanSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/shared/Toast'
import { Chip, DataTable, Mono, PageHeader, Panel, SimTag, Td, Th } from '@/components/shared/ui-kit'
import { HALAL_DEADLINE, MATERIAL_DOCS, type DocStatus } from '@/data/collab'
import { materialById, supplierById } from '@/data/mock'
import { collab, docsFor, useCollab } from '@/lib/collab-store'
import { accessFor } from '@/lib/nav'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'
import { DocStatusChip } from '@/pages/supplier/Documents'

function Dot({ status }: { status: DocStatus }) {
  const c = status === 'Lengkap' ? 'bg-success' : status === 'Tidak berlaku' ? 'bg-fg-subtle/40' : status === 'Kurang' ? 'bg-danger' : 'bg-warning'
  return <span className={cn('inline-block size-2 shrink-0 rounded-full', c)} aria-hidden />
}

function DocCell({ status, label, sub }: { status: DocStatus; label: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1.5"><Dot status={status} /></span>
      <div className="min-w-0">
        <div className={cn('text-[13px] whitespace-nowrap', status === 'Kurang' ? 'font-semibold text-danger' : 'text-fg')}>{label}</div>
        {sub && <div className="max-w-[170px] truncate text-[11.5px] text-fg-subtle">{sub}</div>}
      </div>
    </div>
  )
}

const statusWord = (s: DocStatus) => (s === 'Tidak berlaku' ? 'Tidak wajib' : s === 'Kurang' ? 'Kurang' : s === 'Perlu ditinjau' ? 'Ditinjau' : s === 'Segera kedaluwarsa' ? 'Segera habis' : 'Lengkap')

export function Compliance() {
  const { user } = useSession()
  const access = user ? accessFor(user.id, 'compliance') : null
  const canManage = access === 'Kelola'
  const s = useCollab()
  const toast = useToast()
  const [filter, setFilter] = useState<'all' | 'action'>('action')
  const rows = MATERIAL_DOCS.map((d) => docsFor(d.materialId, s))
  const shown = filter === 'all' ? rows : rows.filter((r) => r.overall !== 'Lengkap')
  const complete = rows.filter((r) => r.overall === 'Lengkap').length
  const missing = rows.filter((r) => r.missing).length
  const coaWaiting = rows.filter((r) => r.coa.status !== 'Lengkap').length
  const expiring = rows.filter((r) => r.halal.status === 'Segera kedaluwarsa').length
  const openNotices = s.notices.filter((n) => n.status === 'Ditinjau QA')

  const kpis = [
    { label: 'Material dokumen lengkap', value: `${complete}/${rows.length}`, icon: BadgeCheck, tone: 'text-success' },
    { label: 'Dokumen kurang', value: String(missing), icon: FileWarning, tone: missing ? 'text-danger' : 'text-fg' },
    { label: 'CoA belum siap rilis', value: String(coaWaiting), icon: ScanSearch, tone: coaWaiting ? 'text-warning' : 'text-fg' },
    { label: 'Perubahan bahan perlu ditinjau', value: String(openNotices.length), icon: Megaphone, tone: openNotices.length ? 'text-warning' : 'text-fg' },
    { label: 'Sertifikat luar negeri < 90 hari', value: String(expiring), icon: CalendarClock, tone: expiring ? 'text-warning' : 'text-fg' },
  ]

  return (
    <>
      <PageHeader
        eyebrow={<><BadgeCheck className="size-3.5" /> Kepatuhan supplier</>}
        title="Halal & BPOM"
        description="Dokumen halal, MSDS, spesifikasi, dan CoA per kode material — plus pemberitahuan perubahan bahan dari supplier. Status di sini menentukan apakah barang bisa langsung dirilis QC."
        meta={<>{access && <Chip tone="info">Akses Anda: {access}</Chip>}<Chip tone="warning" icon={CalendarClock}>Wajib halal kosmetik: {HALAL_DEADLINE}</Chip><SimTag /></>}
      />

      <div className="mb-5 grid grid-cols-2 divide-x overflow-hidden rounded-xl border bg-surface shadow-[var(--shadow-card)] md:grid-cols-5">
        {kpis.map((k, i) => (
          <div key={k.label} className={cn('px-5 py-4', i >= 2 && 'max-md:border-t', i === 2 && 'max-md:border-l-0')}>
            <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg-muted"><k.icon className="size-3.5" aria-hidden /> {k.label}</div>
            <div className={cn('tnum mt-1 text-[26px] leading-none font-semibold', k.tone)}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <Panel
          title="Dokumen per material"
          description="Dicocokkan per kode material + produsen + lokasi produksi · spesifikasi teknis semua material sudah disetujui QA"
          className="xl:col-span-12"
          bodyClassName="pb-1"
          actions={
            <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'action')}>
              <TabsList className="h-8">
                <TabsTrigger value="action" className="h-7 px-2.5 text-xs">Perlu tindakan <span className="tnum ml-1 rounded bg-fg/5 px-1 text-[10.5px]">{rows.length - complete}</span></TabsTrigger>
                <TabsTrigger value="all" className="h-7 px-2.5 text-xs">Semua <span className="tnum ml-1 rounded bg-fg/5 px-1 text-[10.5px]">{rows.length}</span></TabsTrigger>
              </TabsList>
            </Tabs>
          }
        >
          <DataTable minWidth={940}>
            <thead>
              <tr><Th>Material</Th><Th>Produsen · lokasi</Th><Th>Halal</Th><Th>MSDS / pernyataan</Th><Th>CoA lot terakhir</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {shown.map((d) => {
                const m = materialById(d.materialId)
                return (
                  <tr key={d.materialId} className="hover:bg-sunken">
                    <Td>
                      <div className="font-medium whitespace-nowrap text-fg">{m.name}</div>
                      <div className="text-[11.5px] text-fg-subtle"><Mono className="text-[11.5px]">{m.id}</Mono> · {supplierById(m.supplierId).alias}{d.contact ? ' · kontak produk' : ''}</div>
                    </Td>
                    <Td className="text-[13px] text-fg-muted"><div>{d.manufacturer}</div><div className="text-[11.5px] text-fg-subtle">{d.site}</div></Td>
                    <Td><DocCell status={d.halal.status} label={d.halal.kind === 'Tidak wajib' ? 'Tidak wajib' : `${d.halal.kind}`} sub={d.halal.kind === 'Tidak wajib' ? d.halal.ref : d.halal.validity} /></Td>
                    <Td><DocCell status={d.msds} label={statusWord(d.msds)} sub={d.msds === 'Kurang' ? d.missing : undefined} /></Td>
                    <Td><DocCell status={d.coa.status} label={d.coa.lot} sub={d.coa.note} /></Td>
                    <Td><DocStatusChip status={d.overall} /></Td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
          {shown.length === 0 && <p className="py-8 text-center text-sm text-fg-muted">Semua material dokumennya lengkap.</p>}
        </Panel>

        <Panel title="Pemberitahuan perubahan bahan" description="Dikirim supplier sebelum mengganti bahan, sumber, atau lokasi" className="xl:col-span-7" icon={Megaphone}>
          {s.notices.length === 0 ? (
            <p className="py-4 text-sm text-fg-muted">Belum ada pemberitahuan.</p>
          ) : (
            <ul className="divide-y">
              {s.notices.map((n) => {
                const m = materialById(n.materialId)
                return (
                  <li key={n.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[13.5px] font-medium text-fg"><Mono className="text-xs text-fg-muted">{n.id}</Mono>{n.what}</div>
                      <div className="text-xs text-fg-muted">{m.name} ({m.id}) · {supplierById(n.supplierId).alias} · {n.at}</div>
                      <div className="mt-0.5 text-[13px] text-fg">{n.detail}</div>
                    </div>
                    {n.status === 'Ditinjau QA' && canManage ? (
                      <span className="flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => { collab.reviewNotice(n.id, 'Disetujui'); toast({ title: `${n.id} disetujui`, body: 'Status halal material tetap berlaku. Supplier diberi tahu (simulasi).' }) }}><Check /> Setujui</Button>
                        <Button size="sm" variant="outline" onClick={() => { collab.reviewNotice(n.id, 'Perlu uji ulang'); toast({ title: `${n.id} perlu uji ulang`, body: 'QA meminta dokumen/sampel baru sebelum PO berikutnya (simulasi).' }) }}><RotateCcw /> Uji ulang</Button>
                      </span>
                    ) : (
                      <Chip tone={n.status === 'Disetujui' ? 'success' : n.status === 'Perlu uji ulang' ? 'warning' : 'info'}>{n.status}</Chip>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Cara kerja" className="xl:col-span-5" icon={Info}>
          <ul className="space-y-3 text-[13px] text-fg-muted">
            <li><span className="font-medium text-fg">Halal per material.</span> Sertifikat BPJPH berlaku selama komposisi & proses tidak berubah; kemasan yang kontak produk ikut dinilai. Sertifikat luar negeri dan pernyataan bahan tetap punya masa berlaku.</li>
            <li><span className="font-medium text-fg">CoA setiap lot (CPKB BPOM).</span> Supplier melampirkan CoA saat menandai "Sudah dikirim"; QC dapat merilis barang tanpa menunggu dokumen menyusul.</li>
            <li><span className="font-medium text-fg">Perubahan diberitahukan dulu.</span> Pergantian bahan atau sumber tanpa pemberitahuan adalah penyebab umum temuan audit halal.</li>
          </ul>
          <p className="mt-4 flex items-start gap-1.5 text-xs text-fg-subtle"><FlaskConical className="mt-0.5 size-3.5 shrink-0" /> Simulasi — tidak terhubung ke SIHALAL BPJPH, BPOM, atau SAP QM.</p>
        </Panel>
      </div>
    </>
  )
}
