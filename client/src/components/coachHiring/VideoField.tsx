import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { Film, Link2, Loader, RefreshCw, Trash2, Upload } from 'lucide-react'
import { getVideoSignature, uploadCoachVideo } from '../../api/coachApplications'
import { VIDEO_ACCEPT, videoFileProblem, type VideoSource } from '../../content/coachHiring'
import { inputField } from '../../utils/themeClasses'

interface VideoFieldProps {
  source: VideoSource
  uploadedUrl: string
  linkUrl: string
  error?: string
  onSourceChange: (source: VideoSource) => void
  onUploaded: (video: { url: string; publicId: string; fileName: string } | null) => void
  onLinkChange: (url: string) => void
  onUploadingChange: (uploading: boolean) => void
}

const tabClass = (active: boolean) =>
  `flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-md font-semibold text-base transition-colors ${
    active ? 'bg-cta text-cta-ink' : 'text-chalk light:text-chalk-light hover:bg-white/5 light:hover:bg-black/5'
  }`

export default function VideoField({ source, uploadedUrl, linkUrl, error, onSourceChange, onUploaded, onLinkChange, onUploadingChange }: VideoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [fileName, setFileName] = useState('')
  const [uploadError, setUploadError] = useState('')

  useEffect(() => () => abortRef.current?.abort(), [])

  const startUpload = async (file: File) => {
    const problem = videoFileProblem(file)
    if (problem) {
      setUploadError(problem)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setUploadError('')
    setFileName(file.name)
    setProgress(0)
    onUploaded(null)
    onUploadingChange(true)
    try {
      const sig = await getVideoSignature()
      if (file.size > sig.maxBytes) throw new Error('That video is too big. Trim it to about 1 minute, or paste a link instead.')
      const uploaded = await uploadCoachVideo(file, sig, setProgress, controller.signal)
      onUploaded({ ...uploaded, fileName: file.name })
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setUploadError(err?.response?.data?.error || err?.message || 'The upload failed. Please try again.')
        setFileName('')
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
    setFileName('')
    setUploadError('')
    onUploaded(null)
  }

  const uploading = progress !== null
  const shownError = uploadError || error

  return (
    <fieldset className="m-0 p-0 border-0 flex flex-col gap-3">
      <legend className="font-semibold mb-1">A 1 minute video of you</legend>
      <p className="m-0 text-base text-fog light:text-fog-light">
        Tell us who you are and why you want to coach with TRFC. Film it on your phone, no editing needed.
      </p>
      <div className="flex gap-1 p-1 rounded-lg bg-smoke light:bg-smoke-light" role="tablist" aria-label="How to send your video">
        <button type="button" role="tab" aria-selected={source === 'upload'} className={tabClass(source === 'upload')} onClick={() => onSourceChange('upload')}>
          <Upload size={18} aria-hidden="true" /> Upload it
        </button>
        <button type="button" role="tab" aria-selected={source === 'link'} className={tabClass(source === 'link')} onClick={() => onSourceChange('link')}>
          <Link2 size={18} aria-hidden="true" /> Paste a link
        </button>
      </div>

      {source === 'upload' ? (
        <div className="flex flex-col gap-2">
          <input ref={inputRef} type="file" accept={VIDEO_ACCEPT} onChange={onFile} className="sr-only" aria-label="Choose a video file" />
          {uploading ? (
            <div className="rounded-lg border border-white/10 light:border-black/10 p-4 flex flex-col gap-2" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-base">
                <span className="flex items-center gap-2 min-w-0">
                  <Loader size={18} className="animate-spin flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">Uploading {fileName}</span>
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
          ) : uploadedUrl ? (
            <div className="rounded-lg border border-white/10 light:border-black/10 p-4 flex flex-col gap-3">
              <video src={uploadedUrl} controls preload="metadata" className="w-full max-h-[320px] rounded-md bg-black" />
              <div className="flex flex-wrap items-center gap-3 text-base">
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <Film size={18} aria-hidden="true" className="flex-shrink-0" />
                  <span className="truncate">{fileName || 'Your video'} is uploaded</span>
                </span>
                <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 min-h-[44px] underline">
                  <RefreshCw size={16} aria-hidden="true" /> Replace
                </button>
                <button type="button" onClick={remove} className="inline-flex items-center gap-1.5 min-h-[44px] underline">
                  <Trash2 size={16} aria-hidden="true" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 min-h-[140px] rounded-lg border-2 border-dashed border-white/20 light:border-black/20 hover:border-cta transition-colors p-4 text-center"
            >
              <Upload size={28} aria-hidden="true" className="text-cta" />
              <span className="font-semibold">Choose a video</span>
              <span className="text-base text-fog light:text-fog-light">MP4, MOV, WebM or 3GP, up to 150 MB</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="video-link" className="text-base text-fog light:text-fog-light">
            A link to your video on Instagram, TikTok, YouTube or Google Drive. Make sure anyone with the link can watch it.
          </label>
          <input
            id="video-link"
            type="url"
            inputMode="url"
            value={linkUrl}
            onChange={(e) => onLinkChange(e.target.value)}
            placeholder="https://"
            className={`${inputField} w-full min-h-[48px] px-4 rounded-lg`}
            aria-invalid={Boolean(shownError)}
          />
        </div>
      )}

      {shownError && (
        <p className="m-0 text-base text-red-400 light:text-red-600" role="alert">
          {shownError}
        </p>
      )}
    </fieldset>
  )
}
