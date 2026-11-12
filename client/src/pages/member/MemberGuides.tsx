import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertCircle, Download, FileText, Loader } from 'lucide-react'
import { getGuideDownloadUrl, getMemberGuides, type GuideCategory, type MemberGuide } from '../../api/membership'
import { GUIDE_CATEGORY_LABELS, MEMBERSHIP_COPY, fileSize } from '../../content/membership'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import { dashCard, dashMuted } from '../../components/member/dashboard/ui'
import { ctaButton } from '../../utils/themeClasses'

const copy = MEMBERSHIP_COPY.guides
const CATEGORIES = Object.keys(GUIDE_CATEGORY_LABELS) as GuideCategory[]

const chip = (active: boolean) =>
  `px-4 min-h-[44px] rounded-full border font-barlow font-semibold text-sm whitespace-nowrap transition-colors ${
    active
      ? 'bg-cta text-cta-ink border-cta'
      : 'border-white/15 light:border-black/15 text-chalk light:text-chalk-light hover:border-cta'
  }`

function GuideCard({ guide }: { guide: MemberGuide }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const download = async () => {
    // Open the tab before the request so pop-up blockers treat it as a direct click.
    const tab = window.open('', '_blank')
    try {
      setBusy(true)
      setError('')
      const url = await getGuideDownloadUrl(guide.id)
      if (tab) {
        tab.opener = null
        tab.location.href = url
      } else {
        window.location.href = url
      }
    } catch (err: any) {
      tab?.close()
      setError(err?.response?.data?.error || copy.downloadError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className={`${dashCard} flex flex-col`}>
      <div className="flex items-start gap-3">
        <FileText size={22} aria-hidden="true" className="shrink-0 mt-0.5 text-cta light:text-chalk-light" />
        <div className="min-w-0">
          <p className="font-barlow font-semibold text-lg text-chalk light:text-chalk-light">{guide.title}</p>
          <p className="text-xs text-fog light:text-fog-light">
            {GUIDE_CATEGORY_LABELS[guide.category]}
            {guide.bytes > 0 && ` · PDF · ${fileSize(guide.bytes)}`}
          </p>
        </div>
      </div>
      {guide.description && <p className={`${dashMuted} mt-3`}>{guide.description}</p>}
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-lg font-barlow font-semibold text-base disabled:opacity-60 ${ctaButton}`}
        >
          <Download size={18} aria-hidden="true" /> {busy ? copy.downloading : copy.download}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-400 light:text-red-700">
            {error}
          </p>
        )}
      </div>
    </li>
  )
}

export default function MemberGuides() {
  const { loading: memberLoading, isMember } = useMemberDashboard()
  const [guides, setGuides] = useState<MemberGuide[] | null>(null)
  const [error, setError] = useState('')
  const [category, setCategory] = useState<GuideCategory | 'all'>('all')

  useEffect(() => {
    if (memberLoading || !isMember) return
    getMemberGuides()
      .then(setGuides)
      .catch((err: any) => setError(err?.response?.data?.error || copy.loadError))
  }, [memberLoading, isMember])

  if (!memberLoading && !isMember) return <Navigate to="/dashboard" replace />

  const header = <MemberPageHeader title="GUIDES" highlight="LIBRARY" subtitle={copy.subtitle} />
  if (error) {
    return (
      <>
        {header}
        <div className="bg-red-500/10 border border-red-500/20 p-4 flex gap-3 text-red-300 light:text-red-700 text-sm">
          <AlertCircle size={18} /> {error}
        </div>
      </>
    )
  }
  if (!guides) {
    return (
      <>
        {header}
        <div className="flex justify-center py-16">
          <Loader className="w-10 h-10 animate-spin text-cta" />
        </div>
      </>
    )
  }

  const present = CATEGORIES.filter((c) => guides.some((g) => g.category === c))
  const shown = category === 'all' ? guides : guides.filter((g) => g.category === category)

  return (
    <>
      {header}
      {guides.length === 0 ? (
        <div className={`${dashCard} max-w-xl`}>
          <p className={dashMuted}>{copy.empty}</p>
        </div>
      ) : (
        <>
          {present.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 mb-6" role="group" aria-label="Filter guides by category">
              <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')} className={chip(category === 'all')}>
                {copy.all}
              </button>
              {present.map((c) => (
                <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={chip(category === c)}>
                  {GUIDE_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          )}
          {shown.length === 0 ? (
            <p className={dashMuted}>{copy.emptyCategory}</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 list-none p-0 m-0">
              {shown.map((guide) => (
                <GuideCard key={guide.id} guide={guide} />
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}
