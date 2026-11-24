/**
 * Seed data for supplier collaboration and Halal/BPOM document tracking.
 * Illustrative only — no messages are sent anywhere and no regulator system is connected.
 */
import type { RoleId } from './types'

// ---------------------------------------------------------------- PIC per supplier
export const SUPPLIER_PIC: Record<string, { role: RoleId; name: string; title: string; qa: string }> = {
  'SUP-A': { role: 'procurement', name: 'Sinta Maharani', title: 'Procurement', qa: 'Rani Puspita · QA Supplier' },
  'SUP-B': { role: 'procurement', name: 'Sinta Maharani', title: 'Procurement', qa: 'Rani Puspita · QA Supplier' },
  'SUP-C': { role: 'procurement', name: 'Sinta Maharani', title: 'Procurement', qa: 'Rani Puspita · QA Supplier' },
  'SUP-D': { role: 'procurement', name: 'Sinta Maharani', title: 'Procurement', qa: 'Rani Puspita · QA Supplier' },
  'SUP-E': { role: 'procurement', name: 'Sinta Maharani', title: 'Procurement', qa: 'Rani Puspita · QA Supplier' },
  'SUP-F': { role: 'procurement', name: 'Sinta Maharani', title: 'Procurement', qa: 'Rani Puspita · QA Supplier' },
}

// ---------------------------------------------------------------- Messages / timeline per PO
export type MessageKind = 'text' | 'estimate' | 'change' | 'checkin' | 'shipment' | 'system'
export interface Message {
  id: string
  poId: string
  from: 'supplier' | 'paragon' | 'system'
  author: string
  text: string
  at: string
  kind: MessageKind
}

export const SEED_MESSAGES: Message[] = [
  { id: 'm1', poId: 'PO-04567', from: 'supplier', author: 'Joko · Supplier A', kind: 'estimate', at: '9 Nov, 07:38', text: 'Konfirmasi 30.000 dari 40.000 pcs, ETA 21 Nov. Alasan: kapasitas mesin die-cut penuh.' },
  { id: 'm2', poId: 'PO-04567', from: 'system', author: 'Sistem', kind: 'system', at: '9 Nov, 07:40', text: 'Pembaruan diterima Sinta (Procurement). Exception EXC-0231 dibuka.' },
  { id: 'm3', poId: 'PO-04567', from: 'paragon', author: 'Sinta · Procurement', kind: 'text', at: '9 Nov, 07:58', text: 'Terima kasih sudah mengabari lebih awal, Pak Joko. Kami cari tambahan dari supplier lain. Apakah sebagian dari 30.000 bisa dikirim lebih dulu sebelum 21 Nov?' },
  { id: 'm4', poId: 'PO-04573', from: 'supplier', author: 'Lina · Supplier B', kind: 'estimate', at: '8 Nov, 09:05', text: 'Konfirmasi 8.000 dari 12.000 pcs, ETA 17 Nov. Alasan: bahan baku resin terlambat.' },
  { id: 'm5', poId: 'PO-04571', from: 'supplier', author: 'Joko · Supplier A', kind: 'estimate', at: '4 Nov, 15:20', text: 'Sanggup penuh 12.000 pcs, ETA 16 Nov.' },
  { id: 'm6', poId: 'PO-04562', from: 'supplier', author: 'Teguh · Supplier D', kind: 'shipment', at: '8 Nov, 16:10', text: 'Sudah dikirim 20.000 pcs · surat jalan SJ-D-8812 · CoA lot PET-2611-04 terlampir.' },
]

// ---------------------------------------------------------------- Progress check-ins
export type CheckinAnswer = 'sesuai' | 'perbarui' | 'dikirim'
export interface Checkin {
  id: string
  round: string
  poId: string
  supplierId: string
  sentAt: string
  answer?: CheckinAnswer
  answeredAt?: string
  note?: string
}

/** Previous round (8 Nov) — shows what the response board looks like. */
export const SEED_CHECKINS: Checkin[] = [
  { id: 'c1', round: 'R-1108', poId: 'PO-04562', supplierId: 'SUP-D', sentAt: '8 Nov, 08:00', answer: 'dikirim', answeredAt: '8 Nov, 16:10', note: 'SJ-D-8812' },
  { id: 'c2', round: 'R-1108', poId: 'PO-04569', supplierId: 'SUP-C', sentAt: '8 Nov, 08:00', answer: 'sesuai', answeredAt: '8 Nov, 08:12' },
  { id: 'c3', round: 'R-1108', poId: 'PO-04575', supplierId: 'SUP-B', sentAt: '8 Nov, 08:00', answer: 'sesuai', answeredAt: '8 Nov, 10:41' },
  { id: 'c4', round: 'R-1108', poId: 'PO-04566', supplierId: 'SUP-F', sentAt: '8 Nov, 08:00', answer: 'perbarui', answeredAt: '8 Nov, 13:02', note: 'ETA mundur 1 hari ke 15 Nov' },
  { id: 'c5', round: 'R-1108', poId: 'PO-04574', supplierId: 'SUP-E', sentAt: '8 Nov, 08:00' },
]

// ---------------------------------------------------------------- Change requests
export type ChangeStatus = 'Diajukan' | 'Disetujui' | 'Ditolak'
export interface ChangeRequest {
  id: string
  poId: string
  from: 'supplier' | 'paragon'
  author: string
  summary: string
  qty?: number
  date?: string
  reason: string
  impact: string
  status: ChangeStatus
  at: string
}
export const SEED_CHANGES: ChangeRequest[] = [
  { id: 'CR-031', poId: 'PO-04573', from: 'supplier', author: 'Lina · Supplier B', summary: 'Kirim bertahap: 8.000 pcs 17 Nov + 2.000 pcs 24 Nov', qty: 10_000, date: '24 Nov 2026', reason: 'Resin tambahan baru tiba 20 Nov', impact: 'Menutup 2.000 dari kekurangan 2.800 pcs; BT-2611-07 tetap kurang 800 pcs.', status: 'Diajukan', at: '9 Nov, 06:45' },
]

// ---------------------------------------------------------------- Halal & BPOM documents
export type DocStatus = 'Lengkap' | 'Kurang' | 'Perlu ditinjau' | 'Segera kedaluwarsa' | 'Tidak berlaku'
export interface MaterialDocs {
  materialId: string
  manufacturer: string
  site: string
  contact: boolean // packaging touching the product counts as a halal "material"
  halal: { kind: 'Sertifikat BPJPH' | 'Sertifikat luar negeri' | 'Pernyataan bahan' | 'Tidak wajib'; ref: string; validity: string; status: DocStatus }
  msds: DocStatus
  spec: DocStatus
  coa: { lot: string; status: DocStatus; note: string }
  missing?: string // what the supplier still needs to send
}

export const MATERIAL_DOCS: MaterialDocs[] = [
  { materialId: 'M-100234', manufacturer: 'PT Karya Kemasan Mandiri', site: 'Tangerang', contact: false, halal: { kind: 'Tidak wajib', ref: 'Kemasan sekunder — tidak kontak produk', validity: '—', status: 'Tidak berlaku' }, msds: 'Lengkap', spec: 'Lengkap', coa: { lot: 'BOX-2610-21', status: 'Lengkap', note: 'Pengiriman 21 Okt' } },
  { materialId: 'M-100241', manufacturer: 'PT Karya Kemasan Mandiri', site: 'Tangerang', contact: false, halal: { kind: 'Tidak wajib', ref: 'Kemasan sekunder — tidak kontak produk', validity: '—', status: 'Tidak berlaku' }, msds: 'Kurang', spec: 'Lengkap', coa: { lot: 'CTN-2610-27', status: 'Lengkap', note: 'Pengiriman 27 Okt' }, missing: 'MSDS tinta & lem (pernyataan bahan)' },
  { materialId: 'M-100262', manufacturer: 'CV Label Nusantara', site: 'Bogor', contact: false, halal: { kind: 'Pernyataan bahan', ref: 'Perekat label — bebas bahan hewani', validity: 'Berlaku selama komposisi tetap', status: 'Lengkap' }, msds: 'Lengkap', spec: 'Lengkap', coa: { lot: 'LBL-2611-A', status: 'Perlu ditinjau', note: 'Warna cetak tidak sesuai (QH-0409)' } },
  { materialId: 'M-100255', manufacturer: 'PT Prima Plastindo', site: 'Karawang', contact: true, halal: { kind: 'Pernyataan bahan', ref: 'Aditif PET (slip/antistatik) nabati', validity: 'Berlaku selama komposisi tetap', status: 'Lengkap' }, msds: 'Lengkap', spec: 'Lengkap', coa: { lot: 'PET-2611-04', status: 'Lengkap', note: 'Terlampir di SJ-D-8812' } },
  { materialId: 'M-100277', manufacturer: 'PT Prima Plastindo', site: 'Karawang', contact: true, halal: { kind: 'Pernyataan bahan', ref: 'Aditif PE tube nabati', validity: 'Berlaku selama komposisi tetap', status: 'Lengkap' }, msds: 'Lengkap', spec: 'Lengkap', coa: { lot: 'TUB-2611-02', status: 'Lengkap', note: 'Dikirim bersama barang' } },
  { materialId: 'M-100283', manufacturer: 'CV Sinar Kemas Abadi', site: 'Bekasi', contact: true, halal: { kind: 'Pernyataan bahan', ref: 'Pelumas pegas & seal pompa', validity: 'Belum diterima', status: 'Kurang' }, msds: 'Lengkap', spec: 'Lengkap', coa: { lot: '—', status: 'Kurang', note: 'Menunggu pengiriman 17 Nov' }, missing: 'Pernyataan halal pelumas pompa' },
  { materialId: 'M-100290', manufacturer: 'CV Sinar Kemas Abadi', site: 'Bekasi', contact: false, halal: { kind: 'Tidak wajib', ref: 'Film luar — tidak kontak produk', validity: '—', status: 'Tidak berlaku' }, msds: 'Lengkap', spec: 'Lengkap', coa: { lot: 'SHR-2611-01', status: 'Lengkap', note: '—' } },
  { materialId: 'M-200118', manufacturer: 'Zhejiang NiaChem Co.', site: 'Zhejiang, CN', contact: true, halal: { kind: 'Sertifikat luar negeri', ref: 'Lembaga halal luar negeri (diakui BPJPH)', validity: 'Hingga 15 Jan 2027', status: 'Segera kedaluwarsa' }, msds: 'Lengkap', spec: 'Lengkap', coa: { lot: 'NIA-2610-B', status: 'Kurang', note: 'Menunggu CoA (QH-0412)' } },
  { materialId: 'M-200126', manufacturer: 'PT Lumina Chemindo', site: 'Cikarang', contact: true, halal: { kind: 'Sertifikat BPJPH', ref: 'ID-00410-0012345', validity: 'Berlaku selama tidak ada perubahan', status: 'Lengkap' }, msds: 'Lengkap', spec: 'Lengkap', coa: { lot: 'GLY-2611-C', status: 'Perlu ditinjau', note: 'Uji kadar air ulang (QH-0405)' } },
  { materialId: 'M-200131', manufacturer: 'PT Aroma Esensi Indonesia', site: 'Surabaya', contact: true, halal: { kind: 'Sertifikat BPJPH', ref: 'ID-00350-0098765', validity: 'Berlaku selama tidak ada perubahan', status: 'Perlu ditinjau' }, msds: 'Lengkap', spec: 'Lengkap', coa: { lot: 'FR12-2610-07', status: 'Lengkap', note: '—' } },
  { materialId: 'M-200140', manufacturer: 'PT Lumina Chemindo', site: 'Cikarang', contact: true, halal: { kind: 'Sertifikat BPJPH', ref: 'ID-00410-0012399', validity: 'Berlaku selama tidak ada perubahan', status: 'Lengkap' }, msds: 'Lengkap', spec: 'Lengkap', coa: { lot: 'TIO-2610-11', status: 'Lengkap', note: '—' } },
  { materialId: 'M-200152', manufacturer: 'Shandong HyaBio Ltd.', site: 'Shandong, CN', contact: true, halal: { kind: 'Sertifikat luar negeri', ref: 'Lembaga halal luar negeri (diakui BPJPH)', validity: 'Hingga 30 Jun 2027', status: 'Lengkap' }, msds: 'Kurang', spec: 'Lengkap', coa: { lot: 'HA-2610-02', status: 'Lengkap', note: '—' }, missing: 'MSDS versi terbaru' },
]

export interface ChangeNotice {
  id: string
  materialId: string
  supplierId: string
  what: string
  detail: string
  at: string
  status: 'Ditinjau QA' | 'Disetujui' | 'Perlu uji ulang'
}
export const SEED_NOTICES: ChangeNotice[] = [
  { id: 'PP-014', materialId: 'M-200131', supplierId: 'SUP-F', what: 'Ganti pemasok bahan baku', detail: 'Minyak atsiri melati kini dari pemasok baru (Jawa Timur). Komposisi tetap.', at: '5 Nov 2026', status: 'Ditinjau QA' },
]

export const HALAL_DEADLINE = '17 Okt 2028'

/** Projection reliability per supplier (dummy): projected vs actual ordered qty, last 8 weeks. */
export const PROJECTION_RELIABILITY: Record<string, { accuracy: number; weeks: { week: string; projected: number; actual: number }[] }> = {
  'SUP-A': {
    accuracy: 91,
    weeks: [
      { week: 'W42', projected: 30_000, actual: 35_000 },
      { week: 'W43', projected: 12_000, actual: 10_000 },
      { week: 'W44', projected: 40_000, actual: 40_000 },
      { week: 'W45', projected: 14_000, actual: 12_000 },
    ],
  },
}

/** Which projection weeks are already covered by a PO/call-off (firm) per material. */
export const FIRM_WEEKS: Record<string, Record<string, string[]>> = {
  'SUP-A': { W47: ['M-100234', 'M-100241'], W48: ['M-100241'] },
}
