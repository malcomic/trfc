import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { LogOut, QrCode, Keyboard, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  admitScan,
  listScanEvents,
  lookupScan,
  type ScanEvent,
  type ScanLookupResult,
} from '../../api/scan'
import { formatEventDate, formatEventDateTime } from '../../utils/eventDate'

const EVENT_FILTER_KEY = 'trfc_scan_event_id'
const SCAN_MODE_KEY = 'trfc_scan_mode'
const SESSION_CHECKINS_KEY = 'trfc_scan_session_checkins'
const READER_ID = 'qr-reader'
const SUCCESS_DISMISS_MS = 1200
const ERROR_DISMISS_MS = 2000

type ScanMode = 'camera' | 'hardware'

interface SessionCheckIn {
  id: string
  kind: 'ticket' | 'medal'
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

function sessionEntryFromResult(result: ScanLookupResult): SessionCheckIn | null {
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

function statusLabel(result: ScanLookupResult) {
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

export default function AdminScan() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState<ScanEvent[]>([])
  const [eventId, setEventId] = useState(() => sessionStorage.getItem(EVENT_FILTER_KEY) || '')
  const [scanMode, setScanMode] = useState<ScanMode>(() => {
    const stored = sessionStorage.getItem(SCAN_MODE_KEY)
    return stored === 'hardware' ? 'hardware' : 'camera'
  })
  const [result, setResult] = useState<ScanLookupResult | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [admitting, setAdmitting] = useState(false)
  const [flash, setFlash] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [scannerReady, setScannerReady] = useState(false)
  const [sessionCheckIns, setSessionCheckIns] = useState<SessionCheckIn[]>(loadSessionCheckIns)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const busyRef = useRef(false)
  const eventIdRef = useRef(eventId)
  const hardwareInputRef = useRef<HTMLInputElement | null>(null)
  const resetTimeoutRef = useRef<number | undefined>(undefined)
  const manualOpenRef = useRef(manualOpen)

  useEffect(() => {
    manualOpenRef.current = manualOpen
  }, [manualOpen])

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

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const pushSessionCheckIn = useCallback((result: ScanLookupResult) => {
    const entry = sessionEntryFromResult(result)
    if (!entry) return
    setSessionCheckIns((prev) => {
      if (prev.some((item) => item.id === entry.id && item.kind === entry.kind)) {
        return prev
      }
      return [entry, ...prev]
    })
  }, [])

  const setScanModeAndPersist = (mode: ScanMode) => {
    setScanMode(mode)
    sessionStorage.setItem(SCAN_MODE_KEY, mode)
  }

  const focusHardwareInput = useCallback(() => {
    if (!manualOpenRef.current) {
      hardwareInputRef.current?.focus()
      setScannerReady(document.activeElement === hardwareInputRef.current)
    }
  }, [])

  const clearSessionCheckIns = () => {
    setSessionCheckIns([])
    sessionStorage.removeItem(SESSION_CHECKINS_KEY)
    focusHardwareInput()
  }

  const resumeCamera = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      try {
        scannerRef.current.resume()
      } catch {
        /* ignore */
      }
    }
  }, [])

  const scheduleReset = useCallback(
    (ms: number) => {
      clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = window.setTimeout(() => {
        setResult(null)
        setFlash('')
        setAdmitting(false)
        busyRef.current = false
        void resumeCamera()
        focusHardwareInput()
      }, ms)
    },
    [resumeCamera, focusHardwareInput]
  )

  const resetScan = useCallback(() => {
    clearTimeout(resetTimeoutRef.current)
    setResult(null)
    setFlash('')
    setAdmitting(false)
    busyRef.current = false
    void resumeCamera()
    focusHardwareInput()
  }, [resumeCamera, focusHardwareInput])

  const processScan = useCallback(
    async (raw: string) => {
      const value = raw.trim()
      if (!value || busyRef.current) return
      busyRef.current = true
      setLookingUp(true)
      setFlash('')
      clearTimeout(resetTimeoutRef.current)

      try {
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

        if (scannerRef.current?.isScanning) {
          try {
            await scannerRef.current.pause(true)
          } catch {
            /* ignore */
          }
        }

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
            const errData =
              err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: ScanLookupResult } }).response?.data
                : undefined
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
    [scheduleReset, pushSessionCheckIn]
  )

  const handleHardwareKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const value = e.currentTarget.value
      e.currentTarget.value = ''
      void processScan(value)
    }
  }

  useEffect(() => {
    focusHardwareInput()
    return () => clearTimeout(resetTimeoutRef.current)
  }, [focusHardwareInput])

  useEffect(() => {
    if (!manualOpen) {
      focusHardwareInput()
    }
  }, [manualOpen, focusHardwareInput])

  useEffect(() => {
    if (scanMode !== 'camera') {
      setCameraError('')
      return
    }

    let cancelled = false
    const scanner = new Html5Qrcode(READER_ID)
    scannerRef.current = scanner

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 260, height: 260 } },
          (decoded) => {
            void processScan(decoded)
          },
          () => {}
        )
        if (cancelled) {
          await scanner.stop().catch(() => {})
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setCameraError('Camera unavailable. Use manual code entry or switch to scanner gun mode.')
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      if (scanner.isScanning) {
        void scanner.stop().catch(() => {})
      }
      scannerRef.current = null
    }
  }, [processScan, scanMode])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <input
        ref={hardwareInputRef}
        type="text"
        className="sr-only"
        aria-label="Hardware scanner input"
        autoComplete="off"
        onKeyDown={handleHardwareKeyDown}
        onFocus={() => setScannerReady(true)}
        onBlur={() => setScannerReady(false)}
      />

      <header className="sticky top-0 z-20 bg-gray-900/95 border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <QrCode size={22} className="text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-sm tracking-wide uppercase truncate">TRFC Scanner</p>
            <p className="text-xs text-gray-400 truncate">{user?.name || 'Staff'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => setScanModeAndPersist('camera')}
              className={`px-2.5 py-2 min-h-[36px] transition-colors ${
                scanMode === 'camera'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Camera
            </button>
            <button
              type="button"
              onClick={() => setScanModeAndPersist('hardware')}
              className={`px-2.5 py-2 min-h-[36px] transition-colors ${
                scanMode === 'hardware'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Gun
            </button>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white min-h-[44px] px-2"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <div className="px-4 py-3 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
            Event filter
          </label>
          {scannerReady && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Scanner ready
            </span>
          )}
        </div>
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
      </div>

      <div className="flex-1 flex flex-col px-4 py-4 gap-4">
        {scanMode === 'camera' ? (
          <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-h-[55vh] mx-auto w-full max-w-md">
            <div id={READER_ID} className="w-full h-full" />
            {(lookingUp || admitting) && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-sm font-semibold">
                {admitting && !flash ? 'Checking in…' : 'Looking up…'}
              </div>
            )}
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-700 min-h-[180px] mx-auto w-full max-w-md flex flex-col items-center justify-center px-6 py-8 text-center">
            <QrCode size={48} className="text-emerald-400 mb-4" />
            <p className="text-lg font-semibold">Ready to scan</p>
            <p className="text-sm text-gray-400 mt-1">
              Point the scanner gun at a ticket or medal QR code
            </p>
            {(lookingUp || admitting) && (
              <p className="text-sm font-semibold text-emerald-400 mt-4">
                {admitting && !flash ? 'Checking in…' : 'Looking up…'}
              </p>
            )}
          </div>
        )}

        {cameraError && scanMode === 'camera' && (
          <p className="text-amber-400 text-sm text-center">{cameraError}</p>
        )}

        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="mx-auto flex items-center gap-2 min-h-[48px] px-5 rounded-lg bg-gray-800 border border-gray-700 font-semibold"
        >
          <Keyboard size={18} />
          Enter code
        </button>

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
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{item.shortCode}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                        {item.kind === 'ticket' ? 'In' : 'Medal'}
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
              placeholder="Short code or QR payload"
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
