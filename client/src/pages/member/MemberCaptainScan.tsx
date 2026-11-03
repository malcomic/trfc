import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, Keyboard, Loader, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import ScannerView from '../../components/scan/ScannerView'
import MemberResultDetails from '../../components/scan/MemberResultDetails'
import {
  admitMemberCheckin,
  isMemberPayload,
  listCheckinEvents,
  lookupMemberCheckin,
  MEMBER_STATUS_LABELS,
  type CheckinEvent,
  type MemberCheckinResult,
} from '../../api/checkins'
import { formatEventDate } from '../../utils/eventDate'
import { nairobiToday } from '../../utils/calendarGrid'

const EVENT_KEY = 'trfc_captain_scan_event_id'
const SUCCESS_DISMISS_MS = 1200
const ERROR_DISMISS_MS = 2000

interface SessionEntry {
  id: string
  name: string
  at: string
}

function statusTone(status: string, flash: boolean) {
  if (flash || status === 'valid') return 'bg-emerald-600'
  if (status === 'already_checked_in') return 'bg-amber-500'
  return 'bg-red-600'
}

/** Today's community run first, then any event today, then the first one listed. */
function defaultEventId(events: CheckinEvent[]): string {
  const today = nairobiToday()
  const isToday = (ev: CheckinEvent) => ev.event_date.slice(0, 10) === today
  return (
    events.find((ev) => ev.is_community_run && isToday(ev))?.id ??
    events.find(isToday)?.id ??
    events.find((ev) => ev.is_community_run)?.id ??
    events[0]?.id ??
    ''
  )
}

export default function MemberCaptainScan() {
  const { user } = useAuth()
  if (user && user.role !== 'captain') return <Navigate to="/dashboard" replace />
  return <CaptainScanContent />
}

function CaptainScanContent() {
  const [events, setEvents] = useState<CheckinEvent[] | null>(null)
  const [eventId, setEventId] = useState('')
  const [result, setResult] = useState<MemberCheckinResult | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [flash, setFlash] = useState('')
  const [error, setError] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [session, setSession] = useState<SessionEntry[]>([])
  const busyRef = useRef(false)
  const eventIdRef = useRef('')
  const resetTimeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    listCheckinEvents()
      .then((list) => {
        setEvents(list)
        const stored = sessionStorage.getItem(EVENT_KEY)
        setEventId(stored && list.some((ev) => ev.id === stored) ? stored : defaultEventId(list))
      })
      .catch(() => setEvents([]))
    return () => clearTimeout(resetTimeoutRef.current)
  }, [])

  useEffect(() => {
    eventIdRef.current = eventId
    if (eventId) sessionStorage.setItem(EVENT_KEY, eventId)
  }, [eventId])

  const resetScan = useCallback(() => {
    clearTimeout(resetTimeoutRef.current)
    setResult(null)
    setFlash('')
    setError('')
    busyRef.current = false
  }, [])

  const scheduleReset = useCallback(
    (ms: number) => {
      clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = window.setTimeout(resetScan, ms)
    },
    [resetScan]
  )

  const processScan = useCallback(
    async (raw: string) => {
      const value = raw.trim()
      const currentEventId = eventIdRef.current
      if (!value || busyRef.current || !currentEventId) return
      busyRef.current = true
      clearTimeout(resetTimeoutRef.current)
      setFlash('')
      setError('')
      const body = isMemberPayload(value) ? { eventId: currentEventId, payload: value } : { eventId: currentEventId, code: value }
      try {
        setBusy('Looking up…')
        const looked = await lookupMemberCheckin(body)
        setManualOpen(false)
        setManualCode('')
        setResult(looked)
        if (looked.status !== 'valid') {
          scheduleReset(ERROR_DISMISS_MS)
          return
        }
        setBusy('Checking in…')
        const admitted = await admitMemberCheckin(body)
        setResult(admitted)
        if (admitted.status === 'valid' && admitted.member) {
          const member = admitted.member
          setFlash('Checked in')
          setSession((prev) =>
            prev.some((entry) => entry.id === member.id)
              ? prev
              : [{ id: member.id, name: member.name || 'Member', at: admitted.checkedInAt || new Date().toISOString() }, ...prev]
          )
          setEvents((prev) => prev?.map((ev) => (ev.id === currentEventId ? { ...ev, checked_in: ev.checked_in + 1 } : ev)) ?? prev)
          scheduleReset(SUCCESS_DISMISS_MS)
        } else {
          scheduleReset(ERROR_DISMISS_MS)
        }
      } catch (err: unknown) {
        const message =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
            : err instanceof Error
              ? err.message
              : undefined
        setError(message || 'Check-in failed. Try again.')
        setResult({ kind: 'member', status: 'not_found', member: null, checkedInAt: null })
        scheduleReset(ERROR_DISMISS_MS)
      } finally {
        setBusy(null)
      }
    },
    [scheduleReset]
  )

  const selected = events?.find((ev) => ev.id === eventId)

  return (
    <>
      <MemberPageHeader
        title="SCAN"
        highlight="MEMBERS"
        subtitle="Scan each member's TRFC pass at the Saturday run. Every scan counts as a Saturday attended."
        actions={
          <Link to="/dashboard/captain" className="inline-flex items-center gap-1.5 text-sm text-fog light:text-fog-light no-underline hover:underline">
            <ArrowLeft size={14} /> Captain dashboard
          </Link>
        }
      />

      {events === null ? (
        <div className="flex justify-center py-16">
          <Loader className="w-10 h-10 animate-spin text-accent light:text-accent-light" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-center py-10 text-fog light:text-fog-light">
          There are no events in your zone this week. The Saturday run appears here a few days before.
        </p>
      ) : (
        <div className="rounded-2xl bg-gray-950 text-white p-4 sm:p-6 flex flex-col gap-4">
          <div className="mx-auto w-full max-w-md">
            <label htmlFor="captain-scan-event" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Event
            </label>
            <select
              id="captain-scan-event"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full min-h-[44px] rounded-lg bg-gray-800 border border-gray-700 px-3 text-white"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} · {formatEventDate(ev.event_date, { weekday: 'short', month: 'short', day: 'numeric' })}
                </option>
              ))}
            </select>
            {selected && <p className="text-xs text-gray-400 mt-1.5">{selected.checked_in} checked in so far</p>}
          </div>

          <ScannerView
            onScan={(raw) => void processScan(raw)}
            paused={busy !== null || result !== null}
            inputBlocked={manualOpen}
            busyLabel={busy}
            hint="Point the scanner gun at the member's TRFC pass"
          />

          <div className="mx-auto">
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="flex items-center gap-2 min-h-[48px] px-5 rounded-lg bg-gray-800 border border-gray-700 font-semibold"
            >
              <Keyboard size={18} />
              Type a code
            </button>
          </div>

          <div className="w-full max-w-md mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">This session ({session.length})</p>
            {session.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-gray-800 rounded-xl">
                Members you check in will appear here
              </p>
            ) : (
              <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
                {session.map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 flex justify-between gap-3">
                    <p className="font-semibold truncate">{entry.name}</p>
                    <p className="text-xs text-gray-500 shrink-0">
                      {new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {manualOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-900 text-white rounded-2xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Type the member&apos;s code</h2>
              <button type="button" onClick={() => setManualOpen(false)} className="p-2" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualCode.trim() && !busy) {
                  e.preventDefault()
                  void processScan(manualCode)
                }
              }}
              placeholder="ABCDE-FGHJK"
              className="w-full min-h-[48px] rounded-lg bg-gray-800 border border-gray-700 px-3 mb-4 font-mono tracking-widest uppercase"
              autoFocus
            />
            <button
              type="button"
              disabled={!manualCode.trim() || busy !== null}
              onClick={() => void processScan(manualCode)}
              className="w-full min-h-[48px] rounded-lg bg-emerald-600 font-bold disabled:opacity-50"
            >
              Check in
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="fixed inset-0 z-30 bg-black/80 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden bg-gray-900 text-white border border-gray-700">
            <div className={`px-5 py-6 text-center ${statusTone(result.status, !!flash)}`}>
              <p className="text-2xl font-black uppercase tracking-wide">
                {flash || (busy ? busy : error ? 'Check-in failed' : MEMBER_STATUS_LABELS[result.status])}
              </p>
            </div>
            <div className="px-5 py-4 space-y-2 text-sm">
              {error ? <p className="text-gray-300">{error}</p> : <MemberResultDetails result={result} />}
            </div>
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={resetScan}
                className="w-full min-h-[48px] rounded-lg bg-gray-800 border border-gray-700 font-semibold"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
