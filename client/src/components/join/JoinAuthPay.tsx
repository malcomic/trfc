import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader } from 'lucide-react'
import { getMyMembership, type MyMembership } from '../../api/membership'
import { JOIN_COPY } from '../../content/join'
import { MEMBERSHIP_COPY } from '../../content/membership'
import { useAuth } from '../../context/AuthContext'
import RegisterForm from '../register/RegisterForm'
import MembershipPayBox from '../member/membership/MembershipPayBox'
import SectionHeading from '../programs/SectionHeading'
import { dashMuted } from '../member/dashboard/ui'

export const JOIN_AUTH_ANCHOR = 'join-account'

export default function JoinAuthPay() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [membership, setMembership] = useState<MyMembership | null>(null)
  const [loading, setLoading] = useState(!!user)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    if (!user) {
      setMembership(null)
      setLoading(false)
      setError('')
      return Promise.resolve()
    }
    setLoading(true)
    return getMyMembership()
      .then((m) => {
        setMembership(m)
        setError('')
      })
      .catch((err: any) => setError(err?.response?.data?.error || JOIN_COPY.loadError))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  if (!user) {
    return (
      <section id={JOIN_AUTH_ANCHOR} className="scroll-mt-20 bg-ash light:bg-ash-light">
        <div className="max-w-[760px] mx-auto px-4 md:px-6 pt-12 md:pt-16 pb-4 flex flex-col gap-2">
          <div className="font-semibold text-lg text-chalk light:text-chalk-light">{JOIN_COPY.auth.eyebrow}</div>
          <SectionHeading className="mb-0">{JOIN_COPY.auth.heading}</SectionHeading>
          <p className="m-0 text-fog light:text-fog-light">{JOIN_COPY.auth.body}</p>
        </div>
        <RegisterForm redirectTo="/join" />
      </section>
    )
  }

  if (loading) {
    return (
      <section id={JOIN_AUTH_ANCHOR} className="scroll-mt-20 px-4 md:px-6 py-16 flex flex-col items-center gap-4">
        <Loader className="w-10 h-10 animate-spin text-cta" aria-hidden="true" />
        <p className={dashMuted}>{JOIN_COPY.loading}</p>
      </section>
    )
  }

  if (error || !membership) {
    return (
      <section id={JOIN_AUTH_ANCHOR} className="scroll-mt-20 px-4 md:px-6 py-12">
        <div className="max-w-[640px] mx-auto bg-red-500/10 border border-red-500/20 p-4 flex gap-3 text-red-300 light:text-red-700 text-sm">
          <AlertCircle size={18} className="shrink-0" /> {error || JOIN_COPY.loadError}
        </div>
      </section>
    )
  }

  if (membership.active) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <section id={JOIN_AUTH_ANCHOR} className="scroll-mt-20 px-4 md:px-6 py-12 md:py-20 bg-ash light:bg-ash-light">
      <div className="max-w-[560px] mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="font-semibold text-lg text-chalk light:text-chalk-light">{JOIN_COPY.pay.eyebrow}</div>
          <SectionHeading className="mb-0">{JOIN_COPY.pay.heading}</SectionHeading>
          <p className="m-0 text-fog light:text-fog-light">{JOIN_COPY.pay.body}</p>
        </div>
        <MembershipPayBox
          membership={membership}
          heading={JOIN_COPY.pay.priceHeading}
          onPaid={() => navigate('/dashboard')}
          onRefresh={() => {
            void load()
          }}
        />
        <p className={`${dashMuted} text-center`}>{MEMBERSHIP_COPY.hero.body}</p>
      </div>
    </section>
  )
}
