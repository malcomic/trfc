import { ChangeEvent, useEffect, useState } from 'react'
import { AlertCircle, ImageIcon, Loader } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import { uploadPageMedia } from '../../api/pageVideos'
import {
  FIND_CLIENT_SLOTS,
  FINDER_BODY_SLOTS,
  deleteSiteImage,
  getSiteImages,
  saveSiteImage,
  type SiteImage,
  type SiteImages,
  type SiteImageSlot,
} from '../../api/siteImages'
import { COACH_PHOTO, CORE_PROGRAMS } from '../../content/programs'
import { FIND_COPY } from '../../content/quiz'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const MAX_ALT_LENGTH = 255

const CLIENT_STORY_DEFAULTS: Record<
  (typeof FIND_CLIENT_SLOTS)[number],
  { title: string; category: string; resultHint: string }
> = {
  find_client_1: { title: 'Past client 1', category: 'Fat loss', resultHint: 'Lost 8 kg in 12 weeks' },
  find_client_2: { title: 'Past client 2', category: 'Running', resultHint: 'First 5K in 8 weeks' },
  find_client_3: { title: 'Past client 3', category: 'Hiking', resultHint: 'Reached the summit in 6 weeks' },
}

interface SlotConfig {
  slot: SiteImageSlot
  title: string
  description: string
  /** Shown on the site when no image is saved. Null means the site shows a text placeholder. */
  fallback: string | null
  defaultAlt: string
  bodyFat?: boolean
  clientStory?: boolean
  defaultCategory?: string
  resultHint?: string
}

interface SlotGroup {
  heading: string
  slots: SlotConfig[]
}

const GROUPS: SlotGroup[] = [
  {
    heading: 'Coach',
    slots: [
      {
        slot: 'coach',
        title: 'Coach photo',
        description: 'About page "Meet the coach" and the coach section on Find My Program and each program page.',
        fallback: COACH_PHOTO,
        defaultAlt: 'Coach Maurice',
      },
    ],
  },
  {
    heading: 'Programs',
    slots: CORE_PROGRAMS.map(({ id, name }) => ({
      slot: `program_${id}` as SiteImageSlot,
      title: `${name} card photo`,
      description: `Top of the ${name} card on the Programs page. A card image set in Admin › Programs is used instead.`,
      fallback: null,
      defaultAlt: name,
    })),
  },
  {
    heading: 'Find My Program',
    slots: [
      {
        slot: 'find_results_cover',
        title: 'Results cover photo',
        description: 'Covers the member results video until the visitor presses play. Shown on its own if no video is set.',
        fallback: FIND_COPY.results.cover,
        defaultAlt: FIND_COPY.results.coverAlt,
      },
      ...FIND_CLIENT_SLOTS.map((slot) => {
        const defaults = CLIENT_STORY_DEFAULTS[slot]
        return {
          slot,
          title: defaults.title,
          description:
            'Shown in “What past clients say” on Find My Program. Upload a photo and fill in category, quote, name and result.',
          fallback: null,
          defaultAlt: defaults.title,
          clientStory: true,
          defaultCategory: defaults.category,
          resultHint: defaults.resultHint,
        }
      }),
    ],
  },
  {
    heading: 'Program Finder body photos — women',
    slots: FINDER_BODY_SLOTS.filter((slot) => slot.includes('_women_')).map((slot, index) => ({
      slot,
      title: `Women body type ${index + 1}`,
      description: 'Shown in the Find my program body photo carousel for the women’s path.',
      fallback: null,
      defaultAlt: `Women body type ${index + 1}`,
      bodyFat: true,
    })),
  },
  {
    heading: 'Program Finder body photos — men',
    slots: FINDER_BODY_SLOTS.filter((slot) => slot.includes('_men_')).map((slot, index) => ({
      slot,
      title: `Men body type ${index + 1}`,
      description: 'Shown in the Find my program body photo carousel for the men’s path.',
      fallback: null,
      defaultAlt: `Men body type ${index + 1}`,
      bodyFat: true,
    })),
  },
  {
    heading: 'Coach with us',
    slots: [
      {
        slot: 'coach_hiring',
        title: 'Hiring page photo',
        description: 'Top of the Coach with us page (/coach-with-us). The page shows no photo when this is empty.',
        fallback: null,
        defaultAlt: 'TRFC coaches leading a run',
      },
    ],
  },
]

const inputClass =
  'w-full px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
const primaryButton =
  'px-4 py-2 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white font-semibold disabled:opacity-50'
const secondaryButton =
  'px-4 py-2 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50'

function SlotEditor({ config, initial, onChanged }: { config: SlotConfig; initial?: SiteImage; onChanged: () => void }) {
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '')
  const [altText, setAltText] = useState(initial?.alt_text ?? '')
  const [bfMin, setBfMin] = useState(initial?.bf_min != null ? String(initial.bf_min) : '')
  const [bfMax, setBfMax] = useState(initial?.bf_max != null ? String(initial.bf_max) : '')
  const [category, setCategory] = useState(initial?.category ?? config.defaultCategory ?? '')
  const [quote, setQuote] = useState(initial?.quote ?? '')
  const [clientName, setClientName] = useState(initial?.client_name ?? '')
  const [result, setResult] = useState(initial?.result ?? '')
  const [progress, setProgress] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)

  const previewUrl = imageUrl || config.fallback
  const unchanged =
    imageUrl === (initial?.image_url ?? '') &&
    altText.trim() === (initial?.alt_text ?? '') &&
    bfMin === (initial?.bf_min != null ? String(initial.bf_min) : '') &&
    bfMax === (initial?.bf_max != null ? String(initial.bf_max) : '') &&
    category.trim() === (initial?.category ?? config.defaultCategory ?? '') &&
    quote.trim() === (initial?.quote ?? '') &&
    clientName.trim() === (initial?.client_name ?? '') &&
    result.trim() === (initial?.result ?? '')

  const clientStoryReady =
    !config.clientStory ||
    (category.trim() !== '' && quote.trim() !== '' && clientName.trim() !== '' && result.trim() !== '')

  const chooseImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setNotice('')
    if (!file.type.startsWith('image/')) return setError('Choose an image file (JPG, PNG or WebP).')
    if (file.size > MAX_UPLOAD_BYTES) return setError('That image is over 10 MB. Resize it and try again.')
    try {
      setProgress(0)
      setImageUrl(await uploadPageMedia(file, 'image', setProgress, 'trfc_site'))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.')
    } finally {
      setProgress(null)
    }
  }

  const isProgram = config.slot.startsWith('program_')

  const save = async () => {
    setError('')
    setNotice('')
    if (config.clientStory && !clientStoryReady) {
      setError('Fill in category, quote, client name and result before saving.')
      return
    }
    setSaving(true)
    try {
      await saveSiteImage(config.slot, {
        image_url: imageUrl,
        alt_text: altText.trim() || null,
        ...(config.bodyFat
          ? {
              bf_min: bfMin.trim() === '' ? null : Number(bfMin),
              bf_max: bfMax.trim() === '' ? null : Number(bfMax),
            }
          : {}),
        ...(config.clientStory
          ? {
              category: category.trim(),
              quote: quote.trim(),
              client_name: clientName.trim(),
              result: result.trim(),
            }
          : {}),
      })
      setNotice(config.clientStory ? 'Saved. This client story is live on Find My Program.' : 'Saved. The site now shows this image.')
      onChanged()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save the image')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setConfirmRemove(false)
    setError('')
    try {
      await deleteSiteImage(config.slot)
      setImageUrl('')
      setAltText('')
      setBfMin('')
      setBfMax('')
      setCategory(config.defaultCategory ?? '')
      setQuote('')
      setClientName('')
      setResult('')
      setNotice(
        config.fallback
          ? 'Removed. The site shows the default image again.'
          : config.clientStory
            ? 'Removed. This card no longer shows on Find My Program.'
            : 'Removed. The site shows the placeholder again.'
      )
      onChanged()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove the image')
    }
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 text-gray-900 dark:text-gray-100 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{config.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{config.description}</p>
      </div>

      <div
        className={`relative w-full max-w-[360px] ${isProgram ? 'aspect-video' : 'aspect-[4/3]'} rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center`}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={altText || config.defaultAlt}
            className={`absolute inset-0 w-full h-full ${isProgram ? 'object-contain' : 'object-cover'}`}
          />
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">No image yet. The site shows a text placeholder.</span>
        )}
        {!imageUrl && config.fallback && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs font-semibold">Default</span>
        )}
      </div>

      <div className="space-y-2">
        <label className={`${secondaryButton} inline-flex items-center gap-2 cursor-pointer`}>
          <ImageIcon size={16} /> {imageUrl ? 'Replace image' : 'Upload image'}
          <input type="file" accept="image/*" className="hidden" onChange={chooseImage} disabled={progress != null} />
        </label>
        {progress != null && (
          <div className="w-full max-w-sm">
            <div className="h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="h-full bg-primary dark:bg-primary-dark transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">Uploading… {progress}%</p>
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG or WebP, up to 10 MB.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor={`alt-${config.slot}`} className="block text-sm font-semibold">
          Alt text
        </label>
        <input
          id={`alt-${config.slot}`}
          type="text"
          maxLength={MAX_ALT_LENGTH}
          placeholder={config.defaultAlt}
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          A short description for screen readers and search engines. Leave empty to use "{config.defaultAlt}".
          {config.bodyFat ? ' For finder photos, this label also shows under the carousel photo.' : ''}
        </p>
      </div>

      {config.bodyFat && (
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <div className="space-y-1">
            <label htmlFor={`bf-min-${config.slot}`} className="block text-sm font-semibold">
              Body fat min %
            </label>
            <input
              id={`bf-min-${config.slot}`}
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={bfMin}
              onChange={(e) => setBfMin(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`bf-max-${config.slot}`} className="block text-sm font-semibold">
              Body fat max %
            </label>
            <input
              id={`bf-max-${config.slot}`}
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={bfMax}
              onChange={(e) => setBfMax(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {config.clientStory && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor={`category-${config.slot}`} className="block text-sm font-semibold">
              Category
            </label>
            <input
              id={`category-${config.slot}`}
              type="text"
              maxLength={60}
              placeholder={config.defaultCategory || 'Fat loss'}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`quote-${config.slot}`} className="block text-sm font-semibold">
              Quote
            </label>
            <textarea
              id={`quote-${config.slot}`}
              rows={3}
              maxLength={800}
              placeholder="2 or 3 sentences in their own words about what changed for them."
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor={`name-${config.slot}`} className="block text-sm font-semibold">
                Client name
              </label>
              <input
                id={`name-${config.slot}`}
                type="text"
                maxLength={120}
                placeholder="Client name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={`result-${config.slot}`} className="block text-sm font-semibold">
                Result
              </label>
              <input
                id={`result-${config.slot}`}
                type="text"
                maxLength={160}
                placeholder={config.resultHint || 'Lost 8 kg in 12 weeks'}
                value={result}
                onChange={(e) => setResult(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {notice && <p className="text-sm text-green-600 dark:text-green-400">{notice}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!imageUrl || !clientStoryReady || unchanged || saving || progress != null}
          className={primaryButton}
        >
          {saving ? 'Saving…' : config.clientStory ? 'Save story' : 'Save image'}
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
        message={
          config.fallback
            ? 'The site will show the default image until a new one is saved.'
            : config.clientStory
              ? 'This card will no longer appear on Find My Program until a new story is saved.'
              : 'The site will show a text placeholder until a new image is saved.'
        }
        confirmLabel="Remove"
        variant="danger"
        onConfirm={remove}
        onCancel={() => setConfirmRemove(false)}
      />
    </section>
  )
}

export default function AdminSiteImages() {
  const [images, setImages] = useState<SiteImages | null>(null)
  const [error, setError] = useState('')

  const load = () =>
    getSiteImages()
      .then(setImages)
      .catch(() => setError('Failed to load site images'))

  useEffect(() => {
    load()
  }, [])

  return (
    <div>
      <AdminPageHeader
        title="Site Images"
        subtitle="Photos shown across the website. Landing page slides stay in the Gallery."
      />
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {!images ? (
        <div className="flex items-center justify-center h-40">
          <Loader className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-10">
          {GROUPS.map((group) => (
            <div key={group.heading} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{group.heading}</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {group.slots.map((config) => (
                  <SlotEditor key={config.slot} config={config} initial={images[config.slot]} onChanged={load} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
