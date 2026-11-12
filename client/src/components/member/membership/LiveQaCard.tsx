import { useCallback, useEffect, useState } from 'react'
import { CalendarPlus, Video } from 'lucide-react'
import { getLiveQa, type LiveQa } from '../../../api/membership'
import { MEMBERSHIP_COPY, buildIcs, liveQaState, memberDateTime } from '../../../content/membership'
import { ctaButton } from '../../../utils/themeClasses'
import { dashCard, dashHeading, dashLink, dashMuted } from '../dashboard/ui'

const copy = MEMBERSHIP_COPY.liveQa
/** Timers longer than this are skipped; the page is reloaded long before then anyway. */
const MAX_TIMER_MS = 24 * 60 * 60 * 1000

function downloadIcs(qa: LiveQa) {
  const ics = buildIcs({
    start: qa.nextAt!,
    title: qa.title || copy.defaultTitle,
    description: copy.soon,
    url: `${window.location.origin}/dashboard/membership`,
  })
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'trfc-live-qa.ics'
  link.click()
  URL.revokeObjectURL(url)
}

/** The next monthly live Q&A. The Zoom link comes from the server only from 1 hour before the start. */
export default function LiveQaCard({ hideWhenEmpty = false }: { hideWhenEmpty?: boolean }) {
  const [qa, setQa] = useState<LiveQa | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    getLiveQa()
      .then((data) => {
        setQa(data)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [])

  useEffect(load, [load])

  useEffect(() => {
    if (!qa?.joinOpensAt || qa.joinUrl || !qa.isMember) return
    const wait = new Date(qa.joinOpensAt).getTime() - Date.now() + 1000
    if (wait <= 0 || wait > MAX_TIMER_MS) return
    const timer = window.setTimeout(load, wait)
    return () => window.clearTimeout(timer)
  }, [qa, load])

  if (failed || !qa) return null
  const state = liveQaState(qa)
  if (state === 'none' && hideWhenEmpty) return null

  return (
    <div className={dashCard}>
      <div className="flex items-center gap-2">
        <Video size={20} aria-hidden="true" className="text-cta light:text-chalk-light" />
        <h2 className={dashHeading}>{copy.heading}</h2>
      </div>
      {state === 'none' ? (
        <p className={`${dashMuted} mt-2`}>{copy.none}</p>
      ) : (
        <>
          <p className="mt-2 font-barlow font-semibold text-chalk light:text-chalk-light">{qa.title || copy.defaultTitle}</p>
          <p className="text-chalk light:text-chalk-light">{copy.when(memberDateTime(qa.nextAt!))}</p>
          {qa.notes && <p className={`${dashMuted} mt-2 whitespace-pre-line`}>{qa.notes}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {state === 'join' && (
              <a
                href={qa.joinUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-lg font-barlow font-semibold text-base no-underline ${ctaButton}`}
              >
                <Video size={18} aria-hidden="true" /> {copy.join}
              </a>
            )}
            {state === 'soon' && <p className={dashMuted}>{copy.soon}</p>}
            {state === 'members' && <p className={dashMuted}>{copy.members}</p>}
            {state !== 'members' && (
              <button type="button" onClick={() => downloadIcs(qa)} className={`${dashLink} inline-flex items-center gap-1 min-h-[44px] bg-transparent border-0 p-0 cursor-pointer`}>
                <CalendarPlus size={16} aria-hidden="true" /> {copy.calendar}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
