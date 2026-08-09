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
const READER_ID = 'qr-reader'

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
  const [result, setResult] = useState<ScanLookupResult | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [admitting, setAdmitting] = useState(false)
  const [flash, setFlash] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [cameraError, setCameraError] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const busyRef = useRef(false)
  const eventIdRef = useRef(eventId)

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

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const runLookup = useCallback(async (raw: string) => {
    const value = raw.trim()
    if (!value || busyRef.current) return
    busyRef.current = true
    setLookingUp(true)
    setFlash('')
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
    } catch (err) {
      console.error(err)
      setResult({ kind: null, status: 'not_found' })
    } finally {
      setLookingUp(false)
      busyRef.current = false
    }
  }, [])

  const resumeCamera = useCallback(async () => {
    setResult(null)
    setFlash('')
    if (scannerRef.current?.isScanning) {
      try {
        scannerRef.current.resume()
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const scanner = new Html5Qrcode(READER_ID)
    scannerRef.current = scanner

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 260, height: 260 } },
          (decoded) => {
            void runLookup(decoded)
          },
          () => {}
        )
        if (cancelled) {
          await scanner.stop().catch(() => {})
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setCameraError('Camera unavailable. Use manual code entry instead.')
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
  }, [runLookup])

  const handleAdmit = async () => {
    if (!result || result.kind === null || result.status !== 'valid') return
    setAdmitting(true)
    try {
      const updated = await admitScan({
        kind: result.kind,
        id: result.kind === 'ticket' ? result.ticket.id : result.purchase.id,
        eventId: eventId || undefined,
      })
      setResult(updated)
      setFlash(result.kind === 'ticket' ? 'Checked in' : 'Redeemed')
      setTimeout(() => {
        void resumeCamera()
      }, 1500)
    } catch (err: unknown) {
      const data =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: ScanLookupResult } }).response?.data
          : undefined
      if (data && 'status' in data) {
        setResult(data)
      } else {
        setFlash('Admit failed')
      }
    } finally {
      setAdmitting(false)
    }
  }

  const canAdmit = Boolean(result && result.kind && result.status === 'valid')

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
          className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white min-h-[44px] px-2"
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
              {ev.event_date ? ` · ${formatEventDate(ev.event_date, { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 flex flex-col px-4 py-4 gap-4">
        <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-h-[55vh] mx-auto w-full max-w-md">
          <div id={READER_ID} className="w-full h-full" />
          {lookingUp && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-sm font-semibold">
              Looking up…
            </div>
          )}
        </div>

        {cameraError && (
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
      </div>

      {manualOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Enter code</h2>
              <button type="button" onClick={() => setManualOpen(false)} className="p-2" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Short code or QR payload"
              className="w-full min-h-[48px] rounded-lg bg-gray-800 border border-gray-700 px-3 mb-4"
              autoFocus
            />
            <button
              type="button"
              disabled={!manualCode.trim() || lookingUp}
              onClick={() => void runLookup(manualCode)}
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
                {flash || statusLabel(result)}
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
                    <p className="text-amber-300">Checked in {formatWhen(result.ticket.checkedInAt)}</p>
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
                    <p className="text-amber-300">Redeemed {formatWhen(result.purchase.redeemedAt)}</p>
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

            <div className="px-5 pb-5 flex flex-col gap-2">
              {canAdmit && !flash && (
                <button
                  type="button"
                  disabled={admitting}
                  onClick={() => void handleAdmit()}
                  className="w-full min-h-[52px] rounded-lg bg-emerald-600 font-black text-lg uppercase tracking-wide disabled:opacity-50"
                >
                  {admitting
                    ? 'Saving…'
                    : result.kind === 'medal'
                      ? 'Redeem'
                      : 'Admit'}
                </button>
              )}
              <button
                type="button"
                onClick={() => void resumeCamera()}
                className="w-full min-h-[48px] rounded-lg bg-gray-800 border border-gray-700 font-semibold"
              >
                {flash ? 'Continue' : 'Scan next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
