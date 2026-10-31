import { Link } from 'react-router-dom'
import { Loader, MapPin, MessageCircle, User } from 'lucide-react'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import { CONTACT_PATH, DASHBOARD_COPY, supportLink } from '../../content/dashboard'
import type { MemberCaptainSummary } from '../../api/users'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import CaptainPicker from '../../components/member/CaptainPicker'
import { ctaButton } from '../../utils/themeClasses'
import { dashCard, dashHeading, dashLink, dashMuted } from '../../components/member/dashboard/ui'

const copy = DASHBOARD_COPY.zone

export default function MemberZone() {
  const { data, loading, setCaptain, notify } = useMemberDashboard()
  const captain = data?.captain ?? null
  const support = supportLink(captain)

  const handleChanged = (next: MemberCaptainSummary | null) => {
    setCaptain(next)
    if (next) notify('success', copy.savedTitle, copy.savedBody(next.name))
  }

  return (
    <>
      <MemberPageHeader title={copy.title} highlight={copy.highlight} subtitle={copy.subtitle} />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader className="w-10 h-10 animate-spin text-cta" />
        </div>
      ) : captain ? (
        <div className={`${dashCard} max-w-xl`}>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <p className={`${dashMuted} flex items-center gap-2`}>
                <User size={14} aria-hidden="true" /> {copy.captainLabel}
              </p>
              <p className="font-bebas text-3xl tracking-wide mt-1 text-chalk light:text-chalk-light">{captain.name}</p>
            </div>
            <div>
              <p className={`${dashMuted} flex items-center gap-2`}>
                <MapPin size={14} aria-hidden="true" /> {copy.zoneLabel}
              </p>
              <p className="font-bebas text-3xl tracking-wide mt-1 text-chalk light:text-chalk-light">{captain.zone}</p>
            </div>
          </div>
          {support.external ? (
            <a
              href={support.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-6 inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-lg font-barlow font-semibold no-underline ${ctaButton}`}
            >
              <MessageCircle size={18} aria-hidden="true" /> {copy.message}
            </a>
          ) : (
            <div className="mt-6">
              <p className={dashMuted}>{copy.noNumber}</p>
              <Link to={CONTACT_PATH} className={`${dashLink} inline-block mt-2`}>
                {copy.contact}
              </Link>
            </div>
          )}
          <div className="mt-6 pt-5 border-t border-mist light:border-mist-light">
            <CaptainPicker onChanged={handleChanged} />
          </div>
        </div>
      ) : (
        <div className={`${dashCard} max-w-xl`}>
          <h2 className={dashHeading}>{copy.noneHeading}</h2>
          <p className={`${dashMuted} mt-2`}>{copy.noneBody}</p>
          <CaptainPicker startOpen onChanged={handleChanged} />
        </div>
      )}
    </>
  )
}
