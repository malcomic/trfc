import { Navigate } from 'react-router-dom'
import { Loader } from 'lucide-react'
import { useMemberDashboard } from '../../../context/MemberDashboardContext'
import { DASHBOARD_COPY } from '../../../content/dashboard'
import MemberPageHeader from '../MemberPageHeader'
import CtaButton from '../../programs/CtaButton'
import { dashCard, dashMuted } from './ui'

const copy = DASHBOARD_COPY.membersOnly

/** Placeholder for pages that open with membership. Free accounts go back to the dashboard. */
export default function MembersOnlyPage({ heading }: { heading: string }) {
  const { loading, isMember } = useMemberDashboard()

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader className="w-10 h-10 animate-spin text-cta" />
      </div>
    )
  }
  if (!isMember) return <Navigate to="/dashboard" replace />

  return (
    <>
      <MemberPageHeader title={copy.title} highlight={copy.highlight} subtitle={heading} />
      <div className={`${dashCard} max-w-xl`}>
        <p className={dashMuted}>{copy.body}</p>
        <CtaButton to="/dashboard" size="sm" className="mt-5">
          {copy.back}
        </CtaButton>
      </div>
    </>
  )
}
