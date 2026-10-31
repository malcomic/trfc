import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader, X } from 'lucide-react'
import {
  ATTENDANCE_LABELS,
  confirmScanList,
  getScanList,
  markTicketPresent,
  type ScanList,
} from '../../api/attendance'

interface ScanListPanelProps {
  eventId: string
  onClose: () => void
  /** Called after the list is confirmed or someone is marked present. */
  onChanged?: () => void
  /** 'admin' uses the admin palette; 'member' the site theme. */
  tone?: 'admin' | 'member'
}

const TONES = {
  admin: {
    panel: 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
    muted: 'text-gray-500 dark:text-gray-400',
    divider: 'divide-gray-200 dark:divide-gray-700',
    primary: 'bg-primary dark:bg-primary-dark text-white dark:text-black rounded-lg',
    link: 'text-primary dark:text-primary-dark',
  },
  member: {
    panel: 'bg-ash light:bg-ash-light text-chalk light:text-chalk-light',
    muted: 'text-fog light:text-fog-light',
    divider: 'divide-white/10 light:divide-black/10',
    primary: 'bg-cta text-cta-ink font-barlow-condensed font-bold uppercase tracking-widest',
    link: 'text-accent light:text-accent-light',
  },
}

/**
 * The scan list for one event. Confirming it marks unscanned paid tickets as no-shows (their value becomes
 * ticket credit the morning after); a member who came but wasn't scanned can be marked present for a while after.
 */
export default function ScanListPanel({ eventId, onClose, onChanged, tone = 'admin' }: ScanListPanelProps) {
  const t = TONES[tone]
  const [list, setList] = useState<ScanList | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    getScanList(eventId)
      .then(setList)
      .catch((err: any) => setError(err.response?.data?.error || 'Failed to load the scan list'))
  }, [eventId])

  useEffect(load, [load])

  const confirm = async () => {
    if (!window.confirm('Confirm the scan list? Paid tickets that were not scanned are recorded as no-shows.')) return
    setBusy('confirm')
    setError('')
    try {
      const result = await confirmScanList(eventId)
      setMessage(`${result.attended} attended · ${result.noShows} no-shows recorded.`)
      load()
      onChanged?.()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not confirm the scan list')
    } finally {
      setBusy(null)
    }
  }

  const present = async (ticketId: string) => {
    setBusy(ticketId)
    setError('')
    try {
      await markTicketPresent(ticketId)
      load()
      onChanged?.()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not mark this member present')
    } finally {
      setBusy(null)
    }
  }

  const now = Date.now()
  const started = list ? new Date(list.event.starts_at).getTime() <= now : false
  const canMarkPresent = list ? now <= new Date(list.markPresentUntil).getTime() : false
  const scanned = list?.tickets.filter((x) => x.checked_in_at).length ?? 0

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className={`w-full max-w-xl h-full overflow-y-auto p-6 shadow-xl ${t.panel}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">Scan list</h2>
            <p className={`text-sm ${t.muted}`}>{list?.event.title}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="flex gap-2 bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-500 mb-4">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}
        {message && <p className="text-sm text-green-500 mb-4">{message}</p>}

        {!list ? (
          <Loader className={`w-6 h-6 animate-spin ${t.muted}`} />
        ) : (
          <>
            <p className={`text-sm mb-4 ${t.muted}`}>
              {scanned} of {list.tickets.filter((x) => x.payment_status === 'paid').length} paid tickets scanned.
              {list.event.cancelled_at && ' This event was cancelled by TRFC, so nobody is a no-show.'}
            </p>

            {!list.event.cancelled_at &&
              (list.event.scan_list_confirmed_at ? (
                <p className="flex items-center gap-2 text-sm text-green-500 mb-4">
                  <CheckCircle2 size={16} /> Confirmed {new Date(list.event.scan_list_confirmed_at).toLocaleString()}
                </p>
              ) : (
                <button
                  onClick={confirm}
                  disabled={!started || busy === 'confirm'}
                  title={started ? undefined : 'Available once the event has started'}
                  className={`px-4 py-2 min-h-[44px] mb-4 disabled:opacity-50 ${t.primary}`}
                >
                  {busy === 'confirm' ? 'Confirming…' : 'Confirm scan list'}
                </button>
              ))}

            <ul className={`divide-y ${t.divider}`}>
              {list.tickets.map((ticket) => (
                <li key={ticket.id} className="py-2 flex justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{ticket.attendee_name || ticket.user_name || 'Guest'}</p>
                    <p className={`text-xs truncate ${t.muted}`}>{ticket.phone || ticket.email}</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className="text-xs">
                      {ticket.checked_in_at
                        ? `Scanned ${new Date(ticket.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : ticket.attendance_status
                          ? ATTENDANCE_LABELS[ticket.attendance_status]
                          : 'Not scanned'}
                      {ticket.marked_present_at ? ' · marked present' : ''}
                    </p>
                    {ticket.attendance_status === 'no_show' && !ticket.cancel_notice_at && canMarkPresent && (
                      <button
                        onClick={() => present(ticket.id)}
                        disabled={busy === ticket.id}
                        className={`text-xs font-semibold hover:underline disabled:opacity-50 ${t.link}`}
                      >
                        {busy === ticket.id ? 'Saving…' : 'Mark present'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className={`text-xs mt-4 ${t.muted}`}>
              Members who came but were not scanned can be marked present until{' '}
              {new Date(list.markPresentUntil).toLocaleString()}.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
