import { ChangeEvent, useEffect, useState } from 'react'
import { AlertCircle, Film, Link as LinkIcon, Loader, Upload } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import VideoBlock from '../../components/findProgram/VideoBlock'
import {
  deletePageVideo,
  getPageVideos,
  savePageVideo,
  uploadPageMedia,
  type PageVideo,
  type PageVideoSlot,
} from '../../api/pageVideos'
import { FIND_COPY } from '../../content/quiz'
import { parseVideoLink } from '../../utils/videoLink'

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

interface SlotConfig {
  slot: PageVideoSlot
  title: string
  description: string
  withCover: boolean
}

const SLOTS: SlotConfig[] = [
  {
    slot: 'find_hero',
    title: 'Hero video',
    description: 'Top of Find My Program. Starts on its own, muted, with a "Tap to hear" button.',
    withCover: false,
  },
  {
    slot: 'find_results',
    title: 'Member results video',
    description: 'Shown with a cover image. The video starts with sound when the visitor presses play.',
    withCover: true,
  },
]

const inputClass =
  'w-full px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
const primaryButton =
  'px-4 py-2 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white font-semibold disabled:opacity-50'
const secondaryButton =
  'px-4 py-2 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50'

function SlotEditor({ config, initial, onChanged }: { config: SlotConfig; initial?: PageVideo; onChanged: () => void }) {
  const [source, setSource] = useState<'upload' | 'link'>(initial?.source ?? 'upload')
  const [uploadedUrl, setUploadedUrl] = useState(initial?.source === 'upload' ? initial.video_url : '')
  const [link, setLink] = useState(initial?.source === 'link' ? initial.video_url : '')
  const [posterUrl, setPosterUrl] = useState(initial?.poster_url ?? '')
  const [progress, setProgress] = useState<number | null>(null)
  const [posterUploading, setPosterUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)

  const videoUrl = source === 'upload' ? uploadedUrl : link.trim()
  const linkInvalid = source === 'link' && link.trim() !== '' && !parseVideoLink(link)
  const defaultCover = config.withCover ? FIND_COPY.results.cover : null
  const previewPoster = config.withCover ? posterUrl || defaultCover : null

  const chooseVideo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setNotice('')
    if (!file.type.startsWith('video/')) return setError('Choose a video file (MP4, MOV or WebM).')
    if (file.size > MAX_UPLOAD_BYTES) {
      return setError('That file is over 50 MB. Upload it to YouTube or Vimeo and paste the link instead.')
    }
    try {
      setProgress(0)
      setUploadedUrl(await uploadPageMedia(file, 'video', setProgress))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.')
    } finally {
      setProgress(null)
    }
  }

  const chooseCover = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    if (!file.type.startsWith('image/')) return setError('Choose an image file for the cover.')
    try {
      setPosterUploading(true)
      setPosterUrl(await uploadPageMedia(file, 'image'))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Cover upload failed. Please try again.')
    } finally {
      setPosterUploading(false)
    }
  }

  const save = async () => {
    setError('')
    setNotice('')
    setSaving(true)
    try {
      await savePageVideo(config.slot, {
        source,
        video_url: videoUrl,
        poster_url: config.withCover ? posterUrl || null : null,
      })
      setNotice('Saved. The page now shows this video.')
      onChanged()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save the video')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setConfirmRemove(false)
    setError('')
    try {
      await deletePageVideo(config.slot)
      setUploadedUrl('')
      setLink('')
      setPosterUrl('')
      setNotice('Removed. The page shows the placeholder again.')
      onChanged()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove the video')
    }
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 text-gray-900 dark:text-gray-100 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{config.title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{config.description}</p>
      </div>

      <div className="flex gap-2">
        {(['upload', 'link'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSource(value)}
            className={`inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold ${
              source === value
                ? 'bg-primary dark:bg-primary-dark text-white'
                : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            {value === 'upload' ? <Upload size={16} /> : <LinkIcon size={16} />}
            {value === 'upload' ? 'Upload file' : 'Paste link'}
          </button>
        ))}
      </div>

      {source === 'upload' ? (
        <div className="space-y-2">
          <label className={`${secondaryButton} inline-flex items-center gap-2 cursor-pointer`}>
            <Film size={16} /> {uploadedUrl ? 'Replace video' : 'Choose video'}
            <input type="file" accept="video/*" className="hidden" onChange={chooseVideo} disabled={progress != null} />
          </label>
          {progress != null && (
            <div className="w-full max-w-sm">
              <div className="h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div className="h-full bg-primary dark:bg-primary-dark transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">Uploading… {progress}%</p>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">MP4, MOV or WebM, up to 50 MB.</p>
        </div>
      ) : (
        <div className="space-y-1">
          <input
            type="url"
            placeholder="https://youtu.be/… or https://vimeo.com/…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className={inputClass}
          />
          <p className={`text-xs ${linkInvalid ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>
            {linkInvalid
              ? 'This link is not recognised. Use a YouTube, Vimeo or direct .mp4/.webm link.'
              : 'YouTube, Vimeo or a direct .mp4/.webm link.'}
          </p>
        </div>
      )}

      {config.withCover && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Cover image</h3>
          <div className="flex flex-wrap items-center gap-3">
            <label className={`${secondaryButton} inline-flex items-center gap-2 cursor-pointer`}>
              {posterUploading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
              {posterUrl ? 'Replace cover' : 'Upload cover'}
              <input type="file" accept="image/*" className="hidden" onChange={chooseCover} disabled={posterUploading} />
            </label>
            {posterUrl && (
              <button type="button" onClick={() => setPosterUrl('')} className="text-sm text-gray-600 dark:text-gray-300 underline">
                Use the default cover
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {posterUrl ? 'Custom cover selected.' : 'Using the default before/after cover.'}
          </p>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-sm mb-2">Preview</h3>
        <VideoBlock
          key={`${videoUrl}|${previewPoster ?? ''}`}
          video={videoUrl && !linkInvalid ? { video_url: videoUrl } : null}
          placeholder="No video yet"
          hearLabel={FIND_COPY.hero.hear}
          poster={previewPoster}
          posterAlt={config.withCover ? FIND_COPY.results.coverAlt : undefined}
          playLabel={config.withCover ? FIND_COPY.results.play : undefined}
          className="max-w-[560px]"
        />
      </div>

      {error && (
        <div className="flex gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {notice && <p className="text-sm text-green-600 dark:text-green-400">{notice}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={save} disabled={!videoUrl || linkInvalid || saving || progress != null} className={primaryButton}>
          {saving ? 'Saving…' : 'Save video'}
        </button>
        {initial && (
          <button type="button" onClick={() => setConfirmRemove(true)} className={secondaryButton}>
            Remove
          </button>
        )}
      </div>

      <AdminConfirmDialog
        open={confirmRemove}
        title={`Remove ${config.title.toLowerCase()}?`}
        message="The page will show the placeholder until a new video is saved."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={remove}
        onCancel={() => setConfirmRemove(false)}
      />
    </section>
  )
}

export default function AdminPageVideos() {
  const [videos, setVideos] = useState<Partial<Record<PageVideoSlot, PageVideo>> | null>(null)
  const [error, setError] = useState('')

  const load = () =>
    getPageVideos('find')
      .then(setVideos)
      .catch(() => setError('Failed to load page videos'))

  useEffect(() => {
    load()
  }, [])

  return (
    <div>
      <AdminPageHeader
        title="Find My Program videos"
        subtitle="Upload a video file or paste a YouTube/Vimeo link for each spot on the page."
      />
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {!videos ? (
        <div className="flex items-center justify-center h-40">
          <Loader className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {SLOTS.map((config) => (
            <SlotEditor key={config.slot} config={config} initial={videos[config.slot]} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  )
}
