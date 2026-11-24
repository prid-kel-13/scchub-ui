/* Local-only collaboration state for the demo (browser storage). Nothing is sent anywhere. */
import { useSyncExternalStore } from 'react'
import {
  MATERIAL_DOCS,
  SEED_CHANGES,
  SEED_CHECKINS,
  SEED_MESSAGES,
  SEED_NOTICES,
  type ChangeNotice,
  type ChangeRequest,
  type ChangeStatus,
  type Checkin,
  type CheckinAnswer,
  type DocStatus,
  type Message,
  type MessageKind,
} from '@/data/collab'
import { poById } from '@/data/mock'

export interface Delivery {
  qty: number
  date: string
}
export interface Confirmation {
  poId: string
  able: 'penuh' | 'sebagian' | 'tidak'
  deliveries: Delivery[]
  reason?: string
}
export interface Shipment {
  poId: string
  qty: number
  date: string
  sj: string
  coaLot: string
}
export type DocKey = 'halal' | 'msds' | 'spec' | 'coa'

interface State {
  messages: Message[]
  checkins: Checkin[]
  changes: ChangeRequest[]
  confirmations: Record<string, Confirmation>
  shipments: Record<string, Shipment>
  docs: Record<string, Partial<Record<DocKey, DocStatus>>>
  notices: ChangeNotice[]
  seq: number
}

const KEY = 'scchub.demo.collab.v1'
const seed = (): State => ({
  messages: SEED_MESSAGES,
  checkins: SEED_CHECKINS,
  changes: SEED_CHANGES,
  confirmations: {},
  shipments: {},
  docs: {},
  notices: SEED_NOTICES,
  seq: 1,
})

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...seed(), ...JSON.parse(raw) }
  } catch {
    /* storage unavailable */
  }
  return seed()
}

let state: State = load()
const listeners = new Set<() => void>()
function set(next: Partial<State>) {
  state = { ...state, ...next }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}
const now = () => 'Baru saja'
const nextId = (p: string) => {
  const n = state.seq
  state = { ...state, seq: n + 1 }
  return `${p}-${String(n).padStart(3, '0')}`
}

function msg(poId: string, from: Message['from'], author: string, text: string, kind: MessageKind): Message {
  return { id: nextId('m'), poId, from, author, text, kind, at: now() }
}
function answerOpenCheckin(poId: string, answer: CheckinAnswer, note?: string) {
  return state.checkins.map((c) => (c.poId === poId && !c.answer ? { ...c, answer, answeredAt: now(), note } : c))
}

export const collab = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  get: () => state,

  reset() {
    state = seed()
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l())
  },

  sendCheckins(poIds: string[]) {
    const round = nextId('R')
    const created: Checkin[] = poIds.map((poId) => ({ id: nextId('c'), round, poId, supplierId: poById(poId).supplierId, sentAt: now() }))
    const sys = poIds.map((poId) => msg(poId, 'system', 'Sistem', 'Permintaan update progres dikirim lewat tautan WhatsApp (simulasi).', 'checkin'))
    set({ checkins: [...created, ...state.checkins], messages: [...state.messages, ...sys] })
    return round
  },

  answerCheckin(poId: string, answer: CheckinAnswer, author: string, note?: string) {
    const label = { sesuai: 'Produksi sesuai jadwal.', perbarui: 'Perlu perbarui estimasi.', dikirim: 'Barang sudah dikirim.' }[answer]
    set({
      checkins: answerOpenCheckin(poId, answer, note),
      messages: [...state.messages, msg(poId, 'supplier', author, note ? `${label} ${note}` : label, 'checkin')],
    })
  },

  send(poId: string, from: 'supplier' | 'paragon', author: string, text: string) {
    set({ messages: [...state.messages, msg(poId, from, author, text, 'text')] })
  },

  confirm(c: Confirmation, author: string) {
    const text =
      c.able === 'tidak'
        ? `Tidak sanggup memenuhi pesanan. Alasan: ${c.reason}.`
        : `Konfirmasi ${c.able === 'penuh' ? 'penuh' : 'sebagian'}: ${c.deliveries.map((d) => `${d.qty.toLocaleString('id-ID')} pcs ${d.date}`).join(' + ')}${c.reason ? `. Alasan: ${c.reason}` : ''}.`
    set({
      confirmations: { ...state.confirmations, [c.poId]: c },
      checkins: answerOpenCheckin(c.poId, c.able === 'penuh' ? 'sesuai' : 'perbarui', c.able === 'penuh' ? 'Dikonfirmasi penuh' : 'Dikonfirmasi sebagian'),
      messages: [...state.messages, msg(c.poId, 'supplier', author, text, 'estimate')],
    })
  },

  updateEstimate(poId: string, author: string, reason: string, detail: string) {
    set({
      checkins: answerOpenCheckin(poId, 'perbarui', reason),
      messages: [...state.messages, msg(poId, 'supplier', author, `Perbarui estimasi — ${reason}. ${detail}`.trim(), 'estimate')],
    })
  },

  ship(s: Shipment, author: string) {
    const po = poById(s.poId)
    set({
      shipments: { ...state.shipments, [s.poId]: s },
      checkins: answerOpenCheckin(s.poId, 'dikirim', s.sj),
      docs: { ...state.docs, [po.materialId]: { ...state.docs[po.materialId], coa: 'Lengkap' } },
      messages: [...state.messages, msg(s.poId, 'supplier', author, `Sudah dikirim ${s.qty.toLocaleString('id-ID')} pcs tgl ${s.date} · surat jalan ${s.sj} · CoA lot ${s.coaLot} terlampir.`, 'shipment')],
    })
  },

  proposeChange(cr: Omit<ChangeRequest, 'id' | 'status' | 'at'>) {
    const item: ChangeRequest = { ...cr, id: nextId('CR'), status: 'Diajukan', at: now() }
    set({ changes: [item, ...state.changes], messages: [...state.messages, msg(cr.poId, cr.from, cr.author, `Mengajukan perubahan: ${cr.summary}. Alasan: ${cr.reason}.`, 'change')] })
  },

  decideChange(id: string, status: ChangeStatus, author: string, from: 'supplier' | 'paragon') {
    const cr = state.changes.find((c) => c.id === id)
    if (!cr) return
    set({
      changes: state.changes.map((c) => (c.id === id ? { ...c, status } : c)),
      messages: [...state.messages, msg(cr.poId, from, author, `Perubahan ${cr.id} ${status === 'Disetujui' ? 'disetujui' : 'ditolak'}: ${cr.summary}.`, 'change')],
    })
  },

  uploadDoc(materialId: string, key: DocKey) {
    set({ docs: { ...state.docs, [materialId]: { ...state.docs[materialId], [key]: 'Lengkap' } } })
  },

  submitNotice(n: Omit<ChangeNotice, 'id' | 'at' | 'status'>) {
    set({ notices: [{ ...n, id: nextId('PP'), at: now(), status: 'Ditinjau QA' }, ...state.notices] })
  },

  reviewNotice(id: string, status: ChangeNotice['status']) {
    set({ notices: state.notices.map((n) => (n.id === id ? { ...n, status } : n)) })
  },
}

export const useCollab = () => useSyncExternalStore(collab.subscribe, collab.get)

/** Material document view merged with local uploads. */
export function docsFor(materialId: string, s: State) {
  const base = MATERIAL_DOCS.find((d) => d.materialId === materialId)!
  const o = s.docs[materialId] ?? {}
  const halal = { ...base.halal, status: o.halal ?? base.halal.status }
  const msds = o.msds ?? base.msds
  const coa = { ...base.coa, status: o.coa ?? base.coa.status, note: o.coa ? 'Diterima lewat portal (simulasi)' : base.coa.note }
  const statuses: DocStatus[] = [halal.status, msds, base.spec, coa.status]
  const overall: DocStatus = statuses.includes('Kurang') ? 'Kurang' : statuses.includes('Perlu ditinjau') ? 'Perlu ditinjau' : statuses.includes('Segera kedaluwarsa') ? 'Segera kedaluwarsa' : 'Lengkap'
  const missing = msds === 'Kurang' || halal.status === 'Kurang' ? base.missing : undefined
  return { ...base, halal, msds, coa, overall, missing }
}
