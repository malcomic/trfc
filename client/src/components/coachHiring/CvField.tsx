import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { FileText, Loader, RefreshCw, Trash2, Upload } from 'lucide-react'
import { uploadCoachCv, type UploadedCv } from '../../api/coachApplications'
import { CV_ACCEPT, cvFileProblem } from '../../content/coachHiring'

interface CvFieldProps {
  fileName: string
  uploaded: boolean
  error?: string
  onUploaded: (cv: UploadedCv | null) => void
  onUploadingChange: (uploading: boolean) => void
}

export default function CvField({ fileName, uploaded, error, onUploaded, onUploadingChange }: CvFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [pendingName, setPendingName] = useState('')
  const [uploadError, setUploadError] = useState('')

  useEffect(() => () => abortRef.current?.abort(), [])

  const startUpload = async (file: File) => {
    const problem = cvFileProblem(file)
    if (problem) {
      setUploadError(problem)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setUploadError('')
    setPendingName(file.name)
    setProgress(0)
    onUploaded(null)
    onUploadingChange(true)
    try {
      onUploaded(await uploadCoachCv(file, setProgress, controller.signal))
    } catch (err: any) {
      if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
        setUploadError(err?.response?.data?.error || 'The upload failed. Please try again, or apply without a CV.')
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setProgress(null)
        onUploadingChange(false)
      }
    }
  }

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void startUpload(file)
  }

  const remove = () => {
    abortRef.current?.abort()
    setUploadError('')
    onUploaded(null)
  }

  const uploading = progress !== null
  const shownError = uploadError || error

  return (
    <fieldset className="m-0 p-0 border-0 flex flex-col gap-3">
      <legend className="font-semibold mb-1">
        Your CV <span className="font-normal text-fog light:text-fog-light">(optional)</span>
      </legend>
      <p className="m-0 text-base text-fog light:text-fog-light">
        If you have a CV, add it here. You can still apply without one.
      </p>
      <input ref={inputRef} type="file" accept={CV_ACCEPT} onChange={onFile} className="sr-only" aria-label="Choose your CV" />

      {uploading ? (
        <div className="rounded-lg border border-white/10 light:border-black/10 p-4 flex flex-col gap-2" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-base">
            <span className="flex items-center gap-2 min-w-0">
              <Loader size={18} className="animate-spin flex-shrink-0" aria-hidden="true" />
              <span className="truncate">Uploading {pendingName}</span>
            </span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-smoke light:bg-smoke-light overflow-hidden">
            <div className="h-full bg-cta transition-all" style={{ width: `${progress}%` }} />
          </div>
          <button type="button" onClick={remove} className="self-start text-base underline">
            Cancel
          </button>
        </div>
      ) : uploaded ? (
        <div className="rounded-lg border border-white/10 light:border-black/10 p-4 flex flex-wrap items-center gap-3 text-base">
          <span className="flex items-center gap-2 min-w-0 flex-1">
            <FileText size={18} aria-hidden="true" className="flex-shrink-0" />
            <span className="truncate">{fileName || 'Your CV'} is uploaded</span>
          </span>
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 min-h-[44px] underline">
            <RefreshCw size={16} aria-hidden="true" /> Replace
          </button>
          <button type="button" onClick={remove} className="inline-flex items-center gap-1.5 min-h-[44px] underline">
            <Trash2 size={16} aria-hidden="true" /> Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 min-h-[110px] rounded-lg border-2 border-dashed border-white/20 light:border-black/20 hover:border-cta transition-colors p-4 text-center"
        >
          <Upload size={24} aria-hidden="true" className="text-cta" />
          <span className="font-semibold">Choose your CV</span>
          <span className="text-base text-fog light:text-fog-light">PDF or Word, up to 5 MB</span>
        </button>
      )}

      {shownError && (
        <p className="m-0 text-base text-red-400 light:text-red-600" role="alert">
          {shownError}
        </p>
      )}
    </fieldset>
  )
}
