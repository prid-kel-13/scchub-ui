import { Link } from 'react-router'
import { ArrowLeft, Banknote, FlaskConical, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/shared/Logo'
import { Mono } from '@/components/shared/ui-kit'
import { CALL_OFFS, materialById, supplierById, supplierScope } from '@/data/mock'
import { useCollab } from '@/lib/collab-store'
import { fmt } from '@/lib/format'

/** Printable summary of the supplier's confirmed orders — no prices, by design. */
export function OrderSummary({ supplierId }: { supplierId: string }) {
  const s = useCollab()
  const sup = supplierById(supplierId)
  const rows = supplierScope(supplierId)
    .pos.filter((p) => p.status !== 'Diterima')
    .map((p) => {
      const conf = s.confirmations[p.id]
      const qty = conf ? conf.deliveries.reduce((a, d) => a + d.qty, 0) : p.confirmedQty
      const schedule = conf ? conf.deliveries.map((d) => d.date).join(', ') : CALL_OFFS.filter((c) => c.poId === p.id).map((c) => c.date).filter((v, i, a) => a.indexOf(v) === i).join(', ') || p.eta || '—'
      return { po: p, qty, schedule }
    })
    .filter((r) => r.qty)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/supplier" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> Pesanan Saya</Link>
        <Button onClick={() => window.print()} className="bg-teal hover:bg-teal/90"><Printer /> Cetak / simpan PDF</Button>
      </div>

      <article className="rounded-2xl border bg-surface p-6 sm:p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <Logo tone="dark" />
            <h2 className="mt-5 text-xl font-semibold text-fg">Ringkasan Order Terkonfirmasi</h2>
            <p className="text-sm text-fg-muted">Per 9 Nov 2026 · disusun dari data SCCHub</p>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold text-fg">{sup.name}</div>
            <div className="text-fg-muted">Kode vendor {sup.code} · {sup.city}</div>
            <div className="mt-1 text-fg-muted">Pembeli: Paragon (contoh demo)</div>
          </div>
        </header>
        <table className="mt-5 w-full text-[13.5px]">
          <thead>
            <tr className="border-b text-left text-xs text-fg-muted uppercase">
              <th className="py-2 font-semibold">PO</th>
              <th className="py-2 font-semibold">Material</th>
              <th className="py-2 text-right font-semibold">Qty terkonfirmasi</th>
              <th className="py-2 pl-4 font-semibold">Jadwal kirim</th>
              <th className="py-2 font-semibold">Diterbitkan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ po, qty, schedule }) => {
              const m = materialById(po.materialId)
              return (
                <tr key={po.id} className="border-b">
                  <td className="py-2.5"><Mono>{po.id}</Mono></td>
                  <td className="py-2.5">{m.name}</td>
                  <td className="tnum py-2.5 text-right font-medium">{fmt(qty!)} {m.unit}</td>
                  <td className="py-2.5 pl-4">{schedule}</td>
                  <td className="py-2.5 text-fg-muted">{po.issuedAt}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-5 text-xs text-fg-muted">
          Ringkasan ini hanya memuat jumlah dan jadwal, tanpa harga. Dokumen resmi tetap PO yang diterbitkan dari SAP. Dapat dipakai sebagai referensi saat berdiskusi dengan bank mengenai pembiayaan berbasis pesanan.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-warning print:text-fg-muted"><FlaskConical className="size-3.5" /> Contoh demo — data simulasi, bukan dokumen resmi.</p>
      </article>

      <section className="rounded-2xl border border-dashed bg-surface p-5 print:hidden">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Banknote className="size-5" /></span>
          <div>
            <div className="flex items-center gap-2 text-[15px] font-semibold text-fg">Info: pembiayaan rantai pasok <span className="rounded bg-neutral-soft px-1.5 text-[10.5px] font-semibold text-fg-muted">Demo · informasi saja</span></div>
            <p className="mt-1 text-[13px] text-fg-muted">
              Beberapa bank di Indonesia menyediakan pembiayaan bagi supplier berdasarkan pesanan terkonfirmasi dari pembeli besar, sehingga modal kerja tidak tertahan menunggu pembayaran. SCCHub tidak memproses pembayaran atau pembiayaan; tanyakan PIC Procurement Anda bila ingin informasi program yang tersedia.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
