import { useEffect, useState } from 'react'
import { Loader, Maximize2, QrCode, X } from 'lucide-react'
import { getMyPass, regenerateMyPass, type MemberPass } from '../../../api/users'
import { DASHBOARD_COPY } from '../../../content/dashboard'
import { dashCard, dashHeading, dashLink, dashMuted } from './ui'

const copy = DASHBOARD_COPY.pass
const cacheKey = (userId: string) => `trfc_member_pass:${userId}`

function readCache(userId: string): MemberPass | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as MemberPass
    return parsed?.code && parsed?.qrDataUrl ? parsed : null
  } catch {
    return null
  }
}

function writeCache(userId: string, pass: MemberPass) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(pass))
  } catch {
    /* storage full or blocked: the pass still shows from memory */
  }
}

/** Groups the code as ABCDE-FGHJK so it is easy to read out. */
function displayCode(code: string) {
  return code.length > 5 ? `${code.slice(0, 5)}-${code.slice(5)}` : code
}

export default function MemberPassCard({ userId }: { userId: string }) {
  const [pass, setPass] = useState<MemberPass | null>(() => readCache(userId))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fromCache, setFromCache] = useState(false)
  const [fullScreen, setFullScreen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    let cancelled = false
    getMyPass()
      .then((data) => {
        if (cancelled) return
        setPass(data)
        writeCache(userId, data)
        setFromCache(false)
      })
      .catch(() => {
        if (cancelled) return
        if (readCache(userId)) setFromCache(true)
        else setError(copy.failed)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (!fullScreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullScreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullScreen])

  const regenerate = async () => {
    try {
      setRegenerating(true)
      setError('')
      const data = await regenerateMyPass()
      setPass(data)
      writeCache(userId, data)
      setFromCache(false)
      setConfirming(false)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined
      setError(message || copy.failed)
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className={dashCard}>
      <div className="flex items-center gap-2 mb-2">
        <QrCode size={20} aria-hidden="true" className="text-cta" />
        <h2 className={dashHeading}>{copy.heading}</h2>
      </div>
      <p className={`${dashMuted} mb-4`}>{copy.body}</p>

      {loading && !pass ? (
        <div className="flex justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-cta" />
        </div>
      ) : pass ? (
        <>
          <button
            type="button"
            onClick={() => setFullScreen(true)}
            className="block mx-auto bg-white p-3 rounded-xl"
            aria-label={copy.fullScreen}
          >
            <img src={pass.qrDataUrl} alt={`QR code ${pass.code}`} className="w-48 h-48" />
          </button>
          <p className="text-center mt-3 font-mono text-lg tracking-widest text-chalk light:text-chalk-light">
            {displayCode(pass.code)}
          </p>
          {fromCache && <p className={`${dashMuted} text-center mt-1`}>{copy.offline}</p>}

          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            <button type="button" onClick={() => setFullScreen(true)} className={`${dashLink} text-sm inline-flex items-center gap-1`}>
              <Maximize2 size={14} aria-hidden="true" />
              {copy.fullScreen}
            </button>
            {!confirming && (
              <button type="button" onClick={() => setConfirming(true)} className={`${dashLink} text-sm`}>
                {copy.regenerate}
              </button>
            )}
          </div>

          {confirming && (
            <div className="mt-4 rounded-xl border border-white/10 light:border-black/10 p-4">
              <p className={dashMuted}>{copy.regenerateConfirm}</p>
              <div className="flex gap-4 mt-3">
                <button
                  type="button"
                  disabled={regenerating}
                  onClick={() => void regenerate()}
                  className={`${dashLink} text-sm disabled:opacity-50`}
                >
                  {regenerating ? copy.regenerating : copy.regenerateYes}
                </button>
                <button
                  type="button"
                  disabled={regenerating}
                  onClick={() => setConfirming(false)}
                  className="text-sm text-fog light:text-fog-light"
                >
                  {copy.cancel}
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}

      {error && <p className="text-sm text-red-400 mt-3 text-center">{error}</p>}

      {fullScreen && pass && (
        <div
          className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setFullScreen(false)}
        >
          <button
            type="button"
            onClick={() => setFullScreen(false)}
            className="absolute top-4 right-4 p-3 text-gray-900"
            aria-label={copy.close}
          >
            <X size={28} />
          </button>
          <img src={pass.qrDataUrl} alt={`QR code ${pass.code}`} className="w-full max-w-sm aspect-square" />
          {pass.name && <p className="mt-6 text-2xl font-bold text-gray-900 text-center">{pass.name}</p>}
          <p className="mt-2 font-mono text-2xl tracking-widest text-gray-900">{displayCode(pass.code)}</p>
        </div>
      )}
    </div>
  )
}
