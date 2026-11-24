/**
 * "Nilai Kemitraan" (supplier merit) and pendampingan (supplier development) — illustrative.
 * Design rules from the research: 4 components (Quality/Cost-free QCD view), no ranking between suppliers,
 * early reporting can only ADD points, and suppliers can ask for clarification.
 */
import { SUPPLIER_SCORES } from './mock'

export type MeritLevel = 'Mitra Baru' | 'Mitra Berkembang' | 'Mitra Andal' | 'Mitra Unggulan'
export type SupportStatus = 'Mandiri' | 'Dipantau' | 'Perlu Pendampingan'

export const QUALITY: Record<string, number> = { 'SUP-A': 98, 'SUP-B': 95, 'SUP-C': 97, 'SUP-D': 99, 'SUP-E': 92, 'SUP-F': 96 }
/** Openness bonus (early reporting) — only ever adds. */
export const OPENNESS_BONUS: Record<string, number> = { 'SUP-A': 2, 'SUP-B': 1, 'SUP-C': 0, 'SUP-D': 1, 'SUP-E': 0, 'SUP-F': 1 }

export const responseScore = (hours: number) => Math.max(20, Math.min(100, Math.round(100 - (hours - 4) * 2)))

export interface MeritComponent {
  key: 'otd' | 'fill' | 'response' | 'quality'
  label: string
  value: string
  score: number
  weight: number
  hint: string
}

export function meritFor(supplierId: string) {
  const s = SUPPLIER_SCORES.find((x) => x.supplierId === supplierId)!
  const components: MeritComponent[] = [
    { key: 'otd', label: 'Ketepatan waktu', value: `${s.otd}%`, score: s.otd, weight: 30, hint: 'Pengiriman tiba pada tanggal yang disepakati' },
    { key: 'fill', label: 'Ketepatan jumlah', value: `${s.fillRate}%`, score: s.fillRate, weight: 30, hint: 'Jumlah dikirim dibanding jumlah dipesan' },
    { key: 'response', label: 'Kecepatan respons', value: `${s.confirmHours} jam`, score: responseScore(s.confirmHours), weight: 20, hint: 'Waktu mengonfirmasi PO dan menjawab update progres' },
    { key: 'quality', label: 'Kualitas', value: `${QUALITY[supplierId]}%`, score: QUALITY[supplierId], weight: 20, hint: 'Pengiriman lulus QC tanpa catatan' },
  ]
  const base = components.reduce((a, c) => a + (c.score * c.weight) / 100, 0)
  const bonus = OPENNESS_BONUS[supplierId] ?? 0
  const score = Math.min(100, Math.round(base + bonus))
  const level: MeritLevel = score >= 90 ? 'Mitra Unggulan' : score >= 80 ? 'Mitra Andal' : score >= 65 ? 'Mitra Berkembang' : 'Mitra Baru'
  const next = score >= 90 ? null : score >= 80 ? { level: 'Mitra Unggulan', at: 90 } : score >= 65 ? { level: 'Mitra Andal', at: 80 } : { level: 'Mitra Berkembang', at: 65 }
  const weakest = [...components].sort((a, b) => a.score - b.score)[0]
  return { components, base: Math.round(base), bonus, score, level, next, weakest }
}

export const LEVELS: { level: MeritLevel; from: number; benefit: string }[] = [
  { level: 'Mitra Baru', from: 0, benefit: 'Pendampingan awal dan check-in mingguan bersama PIC' },
  { level: 'Mitra Berkembang', from: 65, benefit: 'Proyeksi kebutuhan 12 minggu dan program pengembangan bersama' },
  { level: 'Mitra Andal', from: 80, benefit: 'Prioritas alokasi PO baru untuk material yang Anda pasok' },
  { level: 'Mitra Unggulan', from: 90, benefit: 'Proyeksi diperpanjang, undangan pelatihan & forum supplier' },
]

/** 6-month trend (Jun–Nov 2026), dummy. */
export const MERIT_TREND: Record<string, number[]> = {
  'SUP-A': [70, 72, 74, 73, 76, 79],
  'SUP-B': [84, 82, 80, 79, 78, 77],
  'SUP-C': [95, 96, 96, 97, 97, 98],
  'SUP-D': [96, 97, 97, 98, 98, 99],
  'SUP-E': [86, 85, 85, 84, 84, 83],
  'SUP-F': [90, 91, 92, 92, 93, 94],
}
export const TREND_MONTHS = ['Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov']

export interface MeritEvent {
  id: string
  supplierId: string
  at: string
  delta: number
  component: string
  text: string
}
export const MERIT_EVENTS: MeritEvent[] = [
  { id: 'ME-118', supplierId: 'SUP-A', at: '9 Nov', delta: 2, component: 'Keterbukaan', text: 'Melapor kekurangan PO-04567 sembilan hari sebelum tanggal butuh' },
  { id: 'ME-117', supplierId: 'SUP-A', at: '9 Nov', delta: -4, component: 'Ketepatan jumlah', text: 'PO-04567 dikonfirmasi 30.000 dari 40.000 pcs (75%)' },
  { id: 'ME-112', supplierId: 'SUP-A', at: '27 Okt', delta: 2, component: 'Ketepatan waktu', text: 'PO-04552 diterima sesuai jadwal' },
  { id: 'ME-109', supplierId: 'SUP-A', at: '21 Okt', delta: -2, component: 'Ketepatan waktu', text: 'PO-04548 tiba terlambat 1 hari' },
  { id: 'ME-108', supplierId: 'SUP-A', at: '21 Okt', delta: 1, component: 'Kualitas', text: 'PO-04548 lulus QC tanpa catatan' },
  { id: 'ME-121', supplierId: 'SUP-B', at: '8 Nov', delta: -5, component: 'Ketepatan jumlah', text: 'PO-04573 dikonfirmasi 8.000 dari 12.000 pcs (67%)' },
  { id: 'ME-120', supplierId: 'SUP-B', at: '8 Nov', delta: 1, component: 'Keterbukaan', text: 'Melapor keterlambatan resin sebelum tanggal butuh' },
]

export const TIPS: Record<string, string[]> = {
  'SUP-A': [
    'Konfirmasi sebagian atau kirim bertahap bila kapasitas die-cut tidak cukup — lebih baik daripada terlambat.',
    'Jawab permintaan update progres di hari yang sama untuk menaikkan kecepatan respons.',
  ],
  'SUP-B': ['Simpan stok pengaman resin untuk 2 minggu produksi.', 'Kabari Paragon begitu resin terlambat — nilai keterbukaan bertambah.'],
}

// ---------------------------------------------------------------- Pendampingan (internal status + shared plan)
export const SUPPORT: Record<string, { status: SupportStatus; reason: string; since: string; review: string }> = {
  'SUP-A': { status: 'Dipantau', reason: 'Ketepatan jumlah 75% pada PO-04567; kapasitas die-cut belum terukur.', since: '9 Nov 2026', review: '23 Nov 2026' },
  'SUP-B': { status: 'Perlu Pendampingan', reason: 'Ketepatan jumlah di bawah 80% dua periode berturut-turut; ketergantungan resin impor.', since: '1 Okt 2026', review: '16 Nov 2026' },
  'SUP-C': { status: 'Mandiri', reason: 'Kinerja stabil.', since: '—', review: '—' },
  'SUP-D': { status: 'Mandiri', reason: 'Kinerja stabil.', since: '—', review: '—' },
  'SUP-E': { status: 'Dipantau', reason: 'Respons konfirmasi lambat (31 jam) dan lot label tertahan QC.', since: '6 Nov 2026', review: '20 Nov 2026' },
  'SUP-F': { status: 'Mandiri', reason: 'Kinerja stabil.', since: '—', review: '—' },
}

/** Suppliers whose own inputs are largely imported (kraft paper, resin, chemicals) → candidates for earlier PO release. */
export const IMPORT_EXPOSED: Record<string, string> = {
  'SUP-A': 'Kertas kraft/karton (tidak ada pabrik kraft dalam negeri)',
  'SUP-B': 'Resin plastik impor',
  'SUP-D': 'Resin PET impor',
  'SUP-C': 'Bahan kimia impor',
  'SUP-F': 'Sebagian bahan aroma impor',
}

export interface PlanTask {
  id: string
  supplierId: string
  text: string
  owner: 'Supplier' | 'Paragon' | 'Bersama'
  ownerName: string
  due: string
  done: boolean
}
export const SEED_TASKS: PlanTask[] = [
  { id: 'T-01', supplierId: 'SUP-A', text: 'Sepakati kapasitas die-cut mingguan yang realistis', owner: 'Supplier', ownerName: 'Joko', due: '15 Nov', done: false },
  { id: 'T-02', supplierId: 'SUP-A', text: 'Kunjungan teknis tim Engineering Paragon ke lini die-cut', owner: 'Paragon', ownerName: 'Engineering', due: '20 Nov', done: false },
  { id: 'T-03', supplierId: 'SUP-A', text: 'Kirim bertahap untuk PO di atas 30.000 pcs', owner: 'Bersama', ownerName: 'Joko & Sinta', due: 'Berjalan', done: false },
  { id: 'T-04', supplierId: 'SUP-A', text: 'Proyeksi 12 minggu dibagikan setiap Senin', owner: 'Paragon', ownerName: 'Budi (Planner)', due: 'Rutin', done: true },
  { id: 'T-11', supplierId: 'SUP-B', text: 'Bangun stok pengaman resin 2 minggu', owner: 'Supplier', ownerName: 'Lina', due: '30 Nov', done: false },
  { id: 'T-12', supplierId: 'SUP-B', text: 'Rilis PO pump 2 minggu lebih awal', owner: 'Paragon', ownerName: 'Sinta', due: 'Mulai Des', done: false },
  { id: 'T-13', supplierId: 'SUP-B', text: 'Check-in progres mingguan setiap Kamis', owner: 'Bersama', ownerName: 'Lina & Sinta', due: 'Rutin', done: true },
  { id: 'T-21', supplierId: 'SUP-E', text: 'Kalibrasi warna cetak dengan standar Paragon', owner: 'Supplier', ownerName: 'Fitri', due: '18 Nov', done: false },
]
