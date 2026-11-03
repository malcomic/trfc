import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { QrCode } from 'lucide-react'

const SCAN_MODE_KEY = 'trfc_scan_mode'
const READER_ID = 'qr-reader'

type ScanMode = 'camera' | 'hardware'

interface ScannerViewProps {
  /** Called with the raw text from the camera or the scanner gun. */
  onScan: (raw: string) => void
  /** Pause the camera while a result is on screen or a request is running. */
  paused: boolean
  /** Stop grabbing focus for the scanner gun while a dialog with its own input is open. */
  inputBlocked?: boolean
  busyLabel?: string | null
  hint?: string
}

export default function ScannerView({ onScan, paused, inputBlocked = false, busyLabel, hint }: ScannerViewProps) {
  const [scanMode, setScanMode] = useState<ScanMode>(() =>
    sessionStorage.getItem(SCAN_MODE_KEY) === 'hardware' ? 'hardware' : 'camera'
  )
  const [cameraError, setCameraError] = useState('')
  const [scannerReady, setScannerReady] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const hardwareInputRef = useRef<HTMLInputElement | null>(null)
  const onScanRef = useRef(onScan)
  const blockedRef = useRef(inputBlocked || paused)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    blockedRef.current = inputBlocked || paused
  }, [inputBlocked, paused])

  const focusHardwareInput = useCallback(() => {
    if (blockedRef.current) return
    hardwareInputRef.current?.focus()
    setScannerReady(document.activeElement === hardwareInputRef.current)
  }, [])

  const changeMode = (mode: ScanMode) => {
    setScanMode(mode)
    sessionStorage.setItem(SCAN_MODE_KEY, mode)
  }

  useEffect(() => {
    const scanner = scannerRef.current
    if (paused) {
      if (scanner?.isScanning) {
        try {
          scanner.pause(true)
        } catch {
          /* already paused */
        }
      }
      return
    }
    if (scanner?.isScanning) {
      try {
        scanner.resume()
      } catch {
        /* not paused */
      }
    }
    if (!inputBlocked) focusHardwareInput()
  }, [paused, inputBlocked, focusHardwareInput])

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
          (decoded) => onScanRef.current(decoded),
          () => {}
        )
        if (cancelled) await scanner.stop().catch(() => {})
      } catch (err) {
        console.error(err)
        if (!cancelled) setCameraError('Camera unavailable. Use manual code entry or switch to scanner gun mode.')
      }
    }

    void start()

    return () => {
      cancelled = true
      if (scanner.isScanning) void scanner.stop().catch(() => {})
      scannerRef.current = null
    }
  }, [scanMode])

  const handleHardwareKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const value = e.currentTarget.value
    e.currentTarget.value = ''
    onScanRef.current(value)
  }

  return (
    <>
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

      <div className="mx-auto w-full max-w-md flex items-center justify-between gap-3">
        <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs font-semibold">
          {(['camera', 'hardware'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => changeMode(mode)}
              className={`px-3 py-2 min-h-[36px] transition-colors ${
                scanMode === mode ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {mode === 'camera' ? 'Camera' : 'Gun'}
            </button>
          ))}
        </div>
        {scannerReady && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Scanner ready
          </span>
        )}
      </div>

      {scanMode === 'camera' ? (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-h-[55vh] mx-auto w-full max-w-md">
          <div id={READER_ID} className="w-full h-full" />
          {busyLabel && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-sm font-semibold">
              {busyLabel}
            </div>
          )}
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-700 min-h-[180px] mx-auto w-full max-w-md flex flex-col items-center justify-center px-6 py-8 text-center">
          <QrCode size={48} className="text-emerald-400 mb-4" />
          <p className="text-lg font-semibold">Ready to scan</p>
          <p className="text-sm text-gray-400 mt-1">{hint ?? 'Point the scanner gun at a QR code'}</p>
          {busyLabel && <p className="text-sm font-semibold text-emerald-400 mt-4">{busyLabel}</p>}
        </div>
      )}

      {cameraError && scanMode === 'camera' && <p className="text-amber-400 text-sm text-center">{cameraError}</p>}
    </>
  )
}
