import { useId, useState, type ChangeEvent } from 'react'
import { ImageIcon, Loader, Mic, Trash2, Upload } from 'lucide-react'
import { uploadImage } from '../../../api/admin/upload'
import { errorMessage } from '../../../hooks/useProgramEditor'
import { hintClass, secondaryButton } from './fields'

const MAX_BYTES = 10 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/webm']

async function upload(file: File, folder: string): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('folder', folder)
  const { url } = await uploadImage(form)
  return url
}

function useUpload(folder: string, types: string[], typeLabel: string, onUploaded: (url: string) => void) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!types.includes(file.type)) return setError(`Please choose ${typeLabel}.`)
    if (file.size > MAX_BYTES) return setError('The file must be 10 MB or smaller.')
    setUploading(true)
    setError('')
    try {
      onUploaded(await upload(file, folder))
    } catch (err) {
      setError(errorMessage(err, 'The upload failed. Please try again.'))
    } finally {
      setUploading(false)
    }
  }

  return { uploading, error, onFile }
}

export function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string | null | undefined
  onChange: (url: string | null) => void
  hint?: string
}) {
  const id = useId()
  const { uploading, error, onFile } = useUpload('trfc_programs', IMAGE_TYPES, 'a JPG, PNG, WebP or GIF image', onChange)

  return (
    <div className="space-y-2">
      <span className="block text-sm font-semibold">
        {label} <span className="font-normal text-gray-500">(optional)</span>
      </span>
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-48 aspect-video rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="text-gray-400" size={28} aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={id} className={`${secondaryButton} cursor-pointer`}>
            {uploading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
          </label>
          <input id={id} type="file" accept={IMAGE_TYPES.join(',')} onChange={onFile} disabled={uploading} className="sr-only" />
          {value && (
            <button type="button" onClick={() => onChange(null)} className={`${secondaryButton} text-red-600`}>
              <Trash2 size={16} /> Remove
            </button>
          )}
        </div>
      </div>
      <p className={hintClass}>{hint ?? 'JPG, PNG, WebP or GIF, up to 10 MB.'}</p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export function VoiceNoteField({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const id = useId()
  const { uploading, error, onFile } = useUpload(
    'trfc_program_audio',
    AUDIO_TYPES,
    'an MP3, M4A, OGG or WebM audio file',
    onChange
  )

  return (
    <div className="space-y-2">
      <span className="block text-sm font-semibold">
        Coach voice note <span className="font-normal text-gray-500">(optional)</span>
      </span>
      {value ? (
        <audio controls src={value} className="w-full max-w-md" preload="none" />
      ) : (
        <p className={`${hintClass} flex items-center gap-2`}>
          <Mic size={14} aria-hidden="true" /> No voice note yet.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <label htmlFor={id} className={`${secondaryButton} cursor-pointer`}>
          {uploading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'Uploading…' : value ? 'Replace voice note' : 'Upload voice note'}
        </label>
        <input id={id} type="file" accept={AUDIO_TYPES.join(',')} onChange={onFile} disabled={uploading} className="sr-only" />
        {value && (
          <button type="button" onClick={() => onChange(null)} className={`${secondaryButton} text-red-600`}>
            <Trash2 size={16} /> Remove
          </button>
        )}
      </div>
      <p className={hintClass}>MP3, M4A, OGG or WebM, up to 10 MB. Record it on your phone and upload it here.</p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
