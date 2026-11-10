import { useCallback, useEffect, useRef, useState } from 'react'
import { LogOut, QrCode, Keyboard, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  admitScan,
  listScanEvents,
  lookupScan,
  searchScanTickets,
  type ScanEvent,
  type ScanLookupResult,
  type TicketSearchMatch,
  type TicketScanStatus,
} from '../../api/scan'
import {
  admitMemberCheckin,
  isMemberPayload,
  looksLikeMemberCode,
  lookupMemberCheckin,
  MEMBER_STATUS_LABELS,
  type MemberCheckinResult,
} from '../../api/checkins'
import ScannerView from '../../components/scan/ScannerView'
import MemberResultDetails from '../../components/scan/MemberResultDetails'
import { formatEventDate, formatEventDateTime } from '../../utils/eventDate'

const EVENT_FILTER_KEY = 'trfc_scan_event_id'
const SESSION_CHECKINS_KEY = 'trfc_scan_session_checkins'
const SUCCESS_DISMISS_MS = 1200
const ERROR_DISMISS_MS = 2000

type ScanResult = ScanLookupResult | MemberCheckinResult | { kind: 'member'; status: 'no_event' }

interface SessionCheckIn {
  id: string
  kind: 'ticket' | 'medal' | 'member'
  name: string
  detail: string
  shortCode: string
  at: string
}

function loadSessionCheckIns(): SessionCheckIn[] {
  try {
    const raw = sessionStorage.getItem(SESSION_CHECKINS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as SessionCheckIn[]) : []
  } catch {
    return []
  }
}

function sessionEntryFromResult(result: ScanResult): SessionCheckIn | null {
  if (result.kind === 'ticket' && result.ticket) {
    return {
      id: result.ticket.id,
      kind: 'ticket',
      name: result.ticket.attendeeName || 'Guest',
      detail: result.ticket.eventTitle || 'Unknown event',
      shortCode: result.ticket.shortCode,
      at: result.ticket.checkedInAt || new Date().toISOString(),
    }
  }
  if (result.kind === 'medal' && result.purchase) {
    return {
      id: result.purchase.id,
      kind: 'medal',
      name: result.purchase.buyerName || 'Guest',
      detail: `${result.purchase.tierName || 'Medal'} · ${result.purchase.distanceKm} km`,
      shortCode: result.purchase.shortCode,
      at: result.purchase.redeemedAt || new Date().toISOString(),
    }
  }
  if (result.kind === 'member' && 'member' in result && result.member) {
    return {
      id: result.member.id,
      kind: 'member',
      name: result.member.name || 'Member',
      detail: [result.member.paidMember ? 'Member' : null, result.member.zone ? `${result.member.zone} zone` : 'Member pass']
        .filter(Boolean)
        .join(' · '),
      shortCode: '',
      at: result.checkedInAt || new Date().toISOString(),
    }
  }
  return null
}

function formatWhen(value: string | null | undefined) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function statusTone(status: string) {
  if (status === 'valid') return 'bg-emerald-600'
  if (status === 'already_checked_in' || status === 'already_redeemed') return 'bg-amber-500'
  return 'bg-red-600'
}

const SEARCH_STATUS_LABELS: Record<TicketScanStatus, string> = {
  valid: 'Valid',
  already_checked_in: 'Checked in',
  unpaid: 'Unpaid',
  wrong_event: 'Wrong event',
  not_found: 'Not found',
  ambiguous: 'Ambiguous',
}

function statusLabel(result: ScanResult) {
  if (result.kind === 'member') {
    return result.status === 'no_event' ? 'Choose an event' : MEMBER_STATUS_LABELS[result.status]
  }
  switch (result.status) {
    case 'valid':
      return result.kind === 'medal' ? 'Valid medal' : 'Valid ticket'
    case 'already_checked_in':
      return 'Already checked in'
    case 'already_redeemed':
      return 'Already redeemed'
    case 'unpaid':
      return 'Unpaid'
    case 'wrong_event':
      return 'Wrong event'
    case 'ambiguous':
      return 'Ambiguous code'
    case 'not_found':
    default:
      return 'Not found'
  }
}

function errorBody<T>(err: unknown): T | undefined {
  return err && typeof err === 'object' && 'response' in err
    ? (err as { response?: { data?: T } }).response?.data
    : undefined
}

export default function AdminScan() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState<ScanEvent[]>([])
  const [eventId, setEventId] = useState(() => sessionStorage.getItem(EVENT_FILTER_KEY) || '')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [admitting, setAdmitting] = useState(false)
  const [flash, setFlash] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [sessionCheckIns, setSessionCheckIns] = useState<SessionCheckIn[]>(loadSessionCheckIns)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<TicketSearchMatch[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [admittingId, setAdmittingId] = useState<string | null>(null)
  const busyRef = useRef(false)
  const eventIdRef = useRef(eventId)
  const resetTimeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    eventIdRef.current = eventId
    if (eventId) sessionStorage.setItem(EVENT_FILTER_KEY, eventId)
    else sessionStorage.removeItem(EVENT_FILTER_KEY)
  }, [eventId])

  useEffect(() => {
    listScanEvents()
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
  }, [])

  useEffect(() => {
    sessionStorage.setItem(SESSION_CHECKINS_KEY, JSON.stringify(sessionCheckIns))
  }, [sessionCheckIns])

  useEffect(() => () => clearTimeout(resetTimeoutRef.current), [])

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const pushSessionCheckIn = useCallback((result: ScanResult) => {
    const entry = sessionEntryFromResult(result)
    if (!entry) return
    setSessionCheckIns((prev) => {
      if (prev.some((item) => item.id === entry.id && item.kind === entry.kind)) {
        return prev
      }
      return [entry, ...prev]
    })
  }, [])

  const clearSessionCheckIns = () => {
    setSessionCheckIns([])
    sessionStorage.removeItem(SESSION_CHECKINS_KEY)
  }

  const resetScan = useCallback(() => {
    clearTimeout(resetTimeoutRef.current)
    setResult(null)
    setFlash('')
    setAdmitting(false)
    busyRef.current = false
  }, [])

  const scheduleReset = useCallback(
    (ms: number) => {
      clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = window.setTimeout(resetScan, ms)
    },
    [resetScan]
  )

  const processMemberScan = useCallback(
    async (value: string) => {
      const currentEventId = eventIdRef.current
      if (!currentEventId) {
        setResult({ kind: 'member', status: 'no_event' })
        scheduleReset(ERROR_DISMISS_MS)
        return
      }
      const body = isMemberPayload(value) ? { eventId: currentEventId, payload: value } : { eventId: currentEventId, code: value }
      const looked = await lookupMemberCheckin(body)
      setResult(looked)
      setManualOpen(false)
      setManualCode('')
      if (looked.status !== 'valid') {
        scheduleReset(ERROR_DISMISS_MS)
        return
      }
      setLookingUp(false)
      setAdmitting(true)
      try {
        const admitted = await admitMemberCheckin(body)
        setResult(admitted)
        if (admitted.status === 'valid') {
          setFlash('Checked in')
          pushSessionCheckIn(admitted)
          scheduleReset(SUCCESS_DISMISS_MS)
        } else {
          scheduleReset(ERROR_DISMISS_MS)
        }
      } catch {
        setFlash('Check-in failed')
        scheduleReset(ERROR_DISMISS_MS)
      } finally {
        setAdmitting(false)
      }
    },
    [scheduleReset, pushSessionCheckIn]
  )

  const processScan = useCallback(
    async (raw: string) => {
      const value = raw.trim()
      if (!value || busyRef.current) return
      busyRef.current = true
      setLookingUp(true)
      setFlash('')
      clearTimeout(resetTimeoutRef.current)

      try {
        if (isMemberPayload(value) || looksLikeMemberCode(value)) {
          await processMemberScan(value)
          return
        }

        const body: { payload?: string; shortCode?: string; eventId?: string } = {}
        if (value.includes(':') || value.length > 12) {
          body.payload = value
        } else {
          body.shortCode = value
        }
        if (eventIdRef.current) body.eventId = eventIdRef.current

        const data = await lookupScan(body)
        setResult(data)
        setManualOpen(false)
        setManualCode('')

        if (data.kind && data.status === 'valid') {
          setLookingUp(false)
          setAdmitting(true)
          try {
            const updated = await admitScan({
              kind: data.kind,
              id: data.kind === 'ticket' ? data.ticket.id : data.purchase.id,
              eventId: eventIdRef.current || undefined,
            })
            setResult(updated)
            setFlash(data.kind === 'ticket' ? 'Checked in' : 'Redeemed')
            pushSessionCheckIn(updated)
            scheduleReset(SUCCESS_DISMISS_MS)
          } catch (err: unknown) {
            const errData = errorBody<ScanLookupResult>(err)
            if (errData && 'status' in errData) {
              setResult(errData)
            } else {
              setFlash('Admit failed')
            }
            scheduleReset(ERROR_DISMISS_MS)
          } finally {
            setAdmitting(false)
          }
          return
        }

        scheduleReset(ERROR_DISMISS_MS)
      } catch (err) {
        console.error(err)
        setResult({ kind: null, status: 'not_found' })
        scheduleReset(ERROR_DISMISS_MS)
      } finally {
        setLookingUp(false)
      }
    },
    [scheduleReset, pushSessionCheckIn, processMemberScan]
  )

  const closeSearch = () => {
    setSearchOpen(false)
    setSearchResults(null)
    setSearchError('')
  }

  const runSearch = async () => {
    const term = searchTerm.trim()
    if (!term || searching) return
    try {
      setSearching(true)
      setSearchError('')
      const data = await searchScanTickets({ search: term, eventId: eventIdRef.current || undefined })
      setSearchResults(data.status === 'matches' ? data.tickets : [])
    } catch (err) {
      console.error(err)
      setSearchError('Search failed. Try again.')
    } finally {
      setSearching(false)
    }
  }

  const admitFromSearch = async (match: TicketSearchMatch) => {
    if (admittingId) return
    try {
      setAdmittingId(match.id)
      setSearchError('')
      busyRef.current = true
      clearTimeout(resetTimeoutRef.current)
      const updated = await admitScan({
        kind: 'ticket',
        id: match.id,
        eventId: eventIdRef.current || undefined,
      })
      closeSearch()
      setSearchTerm('')
      setResult(updated)
      setFlash('Checked in')
      pushSessionCheckIn(updated)
      scheduleReset(SUCCESS_DISMISS_MS)
    } catch (err: unknown) {
      busyRef.current = false
      const errData = errorBody<ScanLookupResult>(err)
      if (errData && errData.kind === 'ticket' && errData.ticket) {
        const ticket = errData.ticket
        setSearchResults((prev) =>
          prev ? prev.map((m) => (m.id === ticket.id ? { ...ticket, status: errData.status } : m)) : prev
        )
        setSearchError(statusLabel(errData))
      } else {
        setSearchError('Admit failed')
      }
    } finally {
      setAdmittingId(null)
    }
  }

  const busyLabel = lookingUp || admitting ? (admitting && !flash ? 'Checking in…' : 'Looking up…') : null

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="sticky top-0 z-20 bg-gray-900/95 border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <QrCode size={22} className="text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-sm tracking-wide uppercase truncate">TRFC Scanner</p>
            <p className="text-xs text-gray-400 truncate">{user?.name || 'Staff'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white min-h-[44px] px-2 shrink-0"
        >
          <LogOut size={18} />
          Logout
        </button>
      </header>

      <div className="px-4 py-3 border-b border-gray-800 bg-gray-900">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
          Event filter
        </label>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="w-full min-h-[44px] rounded-lg bg-gray-800 border border-gray-700 px-3 text-white"
        >
          <option value="">All events</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
              {ev.event_date
                ? ` · ${formatEventDate(ev.event_date, { year: 'numeric', month: 'short', day: 'numeric' })}`
                : ''}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1.5">Choose an event to scan member passes.</p>
      </div>

      <div className="flex-1 flex flex-col px-4 py-4 gap-4">
        <ScannerView
          onScan={(raw) => void processScan(raw)}
          paused={lookingUp || admitting || result !== null}
          inputBlocked={manualOpen || searchOpen}
          busyLabel={busyLabel}
          hint="Point the scanner gun at a ticket, medal or member pass QR code"
        />

        <div className="mx-auto flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="flex items-center gap-2 min-h-[48px] px-5 rounded-lg bg-gray-800 border border-gray-700 font-semibold"
          >
            <Keyboard size={18} />
            Enter code
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 min-h-[48px] px-5 rounded-lg bg-gray-800 border border-gray-700 font-semibold"
          >
            <Search size={18} />
            Search
          </button>
        </div>

        <div className="w-full max-w-md mx-auto mt-2">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              This session ({sessionCheckIns.length})
            </p>
            {sessionCheckIns.length > 0 && (
              <button
                type="button"
                onClick={clearSessionCheckIns}
                className="text-xs text-gray-400 hover:text-white min-h-[36px] px-2"
              >
                Clear
              </button>
            )}
          </div>
          {sessionCheckIns.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-gray-800 rounded-xl">
              Successful check-ins and redemptions will appear here
            </p>
          ) : (
            <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
              {sessionCheckIns.map((item) => (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{item.name}</p>
                      <p className="text-sm text-gray-400 truncate">{item.detail}</p>
                      {item.shortCode && <p className="text-xs text-gray-500 font-mono mt-0.5">{item.shortCode}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                        {item.kind === 'ticket' ? 'In' : item.kind === 'member' ? 'Member' : 'Medal'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {manualOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Enter code</h2>
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="p-2"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualCode.trim() && !lookingUp && !admitting) {
                  e.preventDefault()
                  void processScan(manualCode)
                }
              }}
              placeholder="Ticket, medal or member code"
              className="w-full min-h-[48px] rounded-lg bg-gray-800 border border-gray-700 px-3 mb-4"
              autoFocus
            />
            <button
              type="button"
              disabled={!manualCode.trim() || lookingUp || admitting}
              onClick={() => void processScan(manualCode)}
              className="w-full min-h-[48px] rounded-lg bg-emerald-600 font-bold disabled:opacity-50"
            >
              Look up
            </button>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl p-5 border border-gray-700 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Search tickets</h2>
              <button type="button" onClick={closeSearch} className="p-2" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void runSearch()
                }
              }}
              placeholder="Phone, M-Pesa code or name"
              className="w-full min-h-[48px] rounded-lg bg-gray-800 border border-gray-700 px-3 mb-3"
              autoFocus
            />
            <button
              type="button"
              disabled={!searchTerm.trim() || searching}
              onClick={() => void runSearch()}
              className="w-full min-h-[48px] rounded-lg bg-emerald-600 font-bold disabled:opacity-50 mb-3"
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
            <p className="text-xs text-gray-500 mb-3">
              {eventId ? 'Searching the selected event only.' : 'Searching all events.'} Check the name against the
              person's ID before admitting.
            </p>
            {searchError && <p className="text-sm text-red-400 mb-3">{searchError}</p>}
            {searchResults && (
              <div className="overflow-y-auto space-y-2">
                {searchResults.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No matching tickets found.</p>
                ) : (
                  searchResults.map((match) => (
                    <div key={match.id} className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{match.attendeeName || 'Guest'}</p>
                          <p className="text-sm text-gray-400 truncate">{match.eventTitle || 'Unknown event'}</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            {match.shortCode}
                            {match.phone ? ` · ${match.phone}` : ''}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${statusTone(match.status)}`}
                        >
                          {SEARCH_STATUS_LABELS[match.status] || match.status}
                        </span>
                      </div>
                      {match.status === 'valid' && (
                        <button
                          type="button"
                          disabled={admittingId !== null}
                          onClick={() => void admitFromSearch(match)}
                          className="mt-3 w-full min-h-[44px] rounded-lg bg-emerald-600 font-bold disabled:opacity-50"
                        >
                          {admittingId === match.id ? 'Checking in…' : 'Admit'}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="fixed inset-0 z-30 bg-black/80 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden bg-gray-900 border border-gray-700">
            <div
              className={`px-5 py-6 text-center ${
                flash ? 'bg-emerald-600' : statusTone(result.status)
              }`}
            >
              <p className="text-2xl font-black uppercase tracking-wide">
                {flash || (admitting ? 'Checking in…' : statusLabel(result))}
              </p>
            </div>

            <div className="px-5 py-4 space-y-2 text-sm">
              {result.kind === 'ticket' && result.ticket && (
                <>
                  <p className="text-xl font-bold">{result.ticket.attendeeName || 'Guest'}</p>
                  <p className="text-gray-300">{result.ticket.eventTitle || 'Unknown event'}</p>
                  {result.ticket.eventDate && (
                    <p className="text-gray-400">{formatEventDateTime(result.ticket.eventDate)}</p>
                  )}
                  <p className="text-gray-500 font-mono">{result.ticket.shortCode}</p>
                  {result.ticket.checkedInAt && (
                    <p className="text-amber-300">
                      Checked in {formatWhen(result.ticket.checkedInAt)}
                    </p>
                  )}
                </>
              )}

              {result.kind === 'medal' && result.purchase && (
                <>
                  <p className="text-xl font-bold">{result.purchase.buyerName || 'Guest'}</p>
                  <p className="text-gray-300">
                    {result.purchase.tierName} · {result.purchase.distanceKm} km
                  </p>
                  <p className="text-gray-500 font-mono">{result.purchase.shortCode}</p>
                  {result.purchase.redeemedAt && (
                    <p className="text-amber-300">
                      Redeemed {formatWhen(result.purchase.redeemedAt)}
                    </p>
                  )}
                </>
              )}

              {result.kind === 'member' &&
                (result.status === 'no_event' ? (
                  <p className="text-gray-300">Pick the event in the filter above, then scan the member pass again.</p>
                ) : (
                  <MemberResultDetails result={result} />
                ))}

              {(result.kind === null || result.status === 'ambiguous') && (
                <p className="text-gray-300">
                  {result.status === 'ambiguous'
                    ? 'Multiple matches. Scan the full QR or enter a longer code.'
                    : 'No matching ticket or medal found.'}
                </p>
              )}
            </div>

            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={() => resetScan()}
                className="w-full min-h-[48px] rounded-lg bg-gray-800 border border-gray-700 font-semibold"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
