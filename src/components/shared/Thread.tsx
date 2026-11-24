import { useState } from 'react'
import { ArrowLeftRight, Info, PackageCheck, RefreshCw, Send, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Message, MessageKind } from '@/data/collab'
import { collab, useCollab } from '@/lib/collab-store'
import { cn } from '@/lib/utils'

const KIND_ICON: Partial<Record<MessageKind, typeof Info>> = {
  estimate: RefreshCw,
  change: ArrowLeftRight,
  checkin: Timer,
  shipment: PackageCheck,
}
const KIND_LABEL: Partial<Record<MessageKind, string>> = {
  estimate: 'Pembaruan estimasi',
  change: 'Permintaan perubahan',
  checkin: 'Update progres',
  shipment: 'Info pengiriman',
}

export function Thread({
  poId,
  viewer,
  author,
  quickReplies = [],
  readOnly = false,
  className,
}: {
  poId: string
  viewer: 'supplier' | 'paragon'
  author: string
  quickReplies?: string[]
  readOnly?: boolean
  className?: string
}) {
  const s = useCollab()
  const items: Message[] = s.messages.filter((m) => m.poId === poId)
  const [text, setText] = useState('')
  const send = (t: string) => {
    if (!t.trim()) return
    collab.send(poId, viewer, author, t.trim())
    setText('')
  }
  return (
    <div className={cn('flex flex-col', className)}>
      <ol className="flex-1 space-y-3" aria-label={`Percakapan ${poId}`}>
        {items.length === 0 && <li className="py-6 text-center text-sm text-fg-muted">Belum ada percakapan untuk PO ini.</li>}
        {items.map((m) => {
          if (m.from === 'system')
            return (
              <li key={m.id} className="flex items-center justify-center gap-1.5 text-center text-[11.5px] text-fg-subtle">
                <Info className="size-3" aria-hidden /> {m.text} · {m.at}
              </li>
            )
          const mine = m.from === viewer
          const Icon = KIND_ICON[m.kind]
          return (
            <li key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px]', mine ? 'rounded-br-md bg-teal text-white' : 'rounded-bl-md bg-sunken text-fg ring-1 ring-border')}>
                {Icon && (
                  <div className={cn('mb-1 flex items-center gap-1 text-[11px] font-semibold', mine ? 'text-white/85' : 'text-teal')}>
                    <Icon className="size-3" aria-hidden /> {KIND_LABEL[m.kind]}
                  </div>
                )}
                <div>{m.text}</div>
                <div className={cn('mt-1 text-[11px]', mine ? 'text-white/75' : 'text-fg-subtle')}>{m.author} · {m.at}</div>
              </div>
            </li>
          )
        })}
      </ol>
      {!readOnly && (
        <div className="mt-4 border-t pt-3">
          {quickReplies.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quickReplies.map((q) => (
                <button key={q} onClick={() => send(q)} className="rounded-full border px-3 py-1 text-xs text-fg-muted transition-colors hover:border-teal hover:text-teal">
                  {q}
                </button>
              ))}
            </div>
          )}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(text) }}>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Tulis pesan…" className="h-10" aria-label="Tulis pesan" />
            <Button type="submit" size="icon" className="size-10 shrink-0 bg-teal hover:bg-teal/90" aria-label="Kirim pesan" disabled={!text.trim()}>
              <Send />
            </Button>
          </form>
          <p className="mt-1.5 text-[11px] text-fg-subtle">Simulasi — pesan hanya tersimpan di browser ini.</p>
        </div>
      )}
    </div>
  )
}
