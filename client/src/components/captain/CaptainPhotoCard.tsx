import { useRef, useState, type ChangeEvent } from 'react'
import { AlertCircle, Camera, Loader, Trash2 } from 'lucide-react'
import { removeMyCaptainPhoto, uploadMyCaptainPhoto } from '../../api/captains'
import { cardSurface } from '../../utils/themeClasses'
import CaptainAvatar from './CaptainAvatar'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

interface CaptainPhotoCardProps {
  name: string
  photoUrl: string | null
  onChanged: (photoUrl: string | null) => void
}

/** Lets a captain add, change or remove the photo members see when choosing a captain. */
export default function CaptainPhotoCard({ name, photoUrl, onChanged }: CaptainPhotoCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null)
  const [error, setError] = useState('')
  const missing = !photoUrl

  const pick = () => inputRef.current?.click()

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    if (!ACCEPT.split(',').includes(file.type)) return setError('Choose a JPG, PNG or WebP photo.')
    if (file.size > MAX_BYTES) return setError('The photo must be 5 MB or smaller.')
    setBusy('upload')
    try {
      const result = await uploadMyCaptainPhoto(file)
      onChanged(result.photo_url)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload the photo. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    setError('')
    setBusy('remove')
    try {
      await removeMyCaptainPhoto()
      onChanged(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove the photo.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className={`${cardSurface} p-6 flex flex-col sm:flex-row sm:items-center gap-5 ${
        missing ? 'border-l-4 border-l-accent light:border-l-accent-light' : ''
      }`}
    >
      <CaptainAvatar name={name} photoUrl={photoUrl} size="xl" />
      <div className="min-w-0 flex-1">
        <h2 className="font-barlow-condensed font-bold text-xl tracking-tighter mb-1">
          {missing ? 'Add a profile photo so members can recognise you' : 'Your profile photo'}
        </h2>
        <p className="text-sm text-fog light:text-fog-light mb-4">
          Members see this photo when they choose a captain. Use a clear, friendly photo of your face. JPG, PNG or
          WebP, up to 5 MB.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={pick}
            disabled={busy !== null}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cta text-cta-ink font-barlow-condensed font-bold text-sm tracking-widest uppercase disabled:opacity-60"
          >
            {busy === 'upload' ? <Loader size={14} className="animate-spin" /> : <Camera size={14} />}
            {busy === 'upload' ? 'Uploading…' : missing ? 'Upload photo' : 'Change photo'}
          </button>
          {!missing && (
            <button
              type="button"
              onClick={remove}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:underline disabled:opacity-60"
            >
              {busy === 'remove' ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />} Remove
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={upload} />
        {error && (
          <p className="mt-3 flex items-center gap-2 text-sm text-red-400 light:text-red-600" role="alert">
            <AlertCircle size={16} aria-hidden="true" /> {error}
          </p>
        )}
      </div>
    </div>
  )
}
