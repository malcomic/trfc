import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  Loader,
  MapPin,
  MessageCircle,
  Users,
  UsersRound,
  Wallet,
  TrendingUp,
  Clock,
  BadgeCheck,
  ClipboardCheck,
  Crown,
} from 'lucide-react'
import { cardSurface } from '../../utils/themeClasses'
import { useAuth } from '../../context/AuthContext'
import {
  getMyCaptainProfile,
  getMyCommissions,
  getMyPayouts,
  getMyReferralQr,
  getMyReferrals,
  getMyTeam,
  SOURCE_LABELS,
  type CaptainCommissionPage,
  type CaptainPayout,
  type CaptainProfile,
  type CaptainReferral,
  type CaptainTeamMember,
  type CommissionStatus,
} from '../../api/captains'
import { buildReferralLink } from '../../utils/referral'
import { COMMISSION_STATUS_STYLES, formatDate, formatKes, formatRate } from '../../utils/captainDisplay'
import StatTile from '../../components/dashboard/StatTile'
import DashboardTabs from '../../components/dashboard/DashboardTabs'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import ScanListPanel from '../../components/attendance/ScanListPanel'
import { getAttendanceEvents, type AttendanceEvent } from '../../api/attendance'

type Tab = 'commissions' | 'referrals' | 'team' | 'payouts' | 'attendance'

const TAB_LABELS: Record<Tab, string> = {
  commissions: 'Commissions',
  referrals: 'Referrals',
  team: 'Team members',
  payouts: 'Payouts',
  attendance: 'Scan lists',
}

const PAGE_SIZE = 20

export default function MemberCaptain() {
  const { user } = useAuth()
  if (user && user.role !== 'captain') return <Navigate to="/dashboard" replace />
  return <CaptainContent />
}

function CaptainContent() {
  const [profile, setProfile] = useState<CaptainProfile | null>(null)
  const [qr, setQr] = useState<{ link: string; dataUrl: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<Tab>('commissions')

  const [commissionStatus, setCommissionStatus] = useState<CommissionStatus | ''>('')
  const [commissionPage, setCommissionPage] = useState(1)
  const [commissions, setCommissions] = useState<CaptainCommissionPage | null>(null)
  const [referrals, setReferrals] = useState<CaptainReferral[] | null>(null)
  const [team, setTeam] = useState<CaptainTeamMember[] | null>(null)
  const [payouts, setPayouts] = useState<CaptainPayout[] | null>(null)
  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceEvent[] | null>(null)
  const [scanEventId, setScanEventId] = useState<string | null>(null)
  const [tabLoading, setTabLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMyCaptainProfile()
        setProfile(data)
        getMyReferralQr(window.location.origin)
          .then(setQr)
          .catch(() => setQr(null))
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load your captain dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!profile || tab !== 'commissions') return
    setTabLoading(true)
    getMyCommissions({ status: commissionStatus || undefined, page: commissionPage, limit: PAGE_SIZE })
      .then(setCommissions)
      .catch(() => setCommissions({ commissions: [], total: 0, page: 1, limit: PAGE_SIZE }))
      .finally(() => setTabLoading(false))
  }, [profile, tab, commissionStatus, commissionPage])

  useEffect(() => {
    if (!profile) return
    if (tab === 'referrals' && referrals === null) {
      setTabLoading(true)
      getMyReferrals()
        .then(setReferrals)
        .catch(() => setReferrals([]))
        .finally(() => setTabLoading(false))
    }
    if (tab === 'team' && team === null) {
      setTabLoading(true)
      getMyTeam()
        .then(setTeam)
        .catch(() => setTeam([]))
        .finally(() => setTabLoading(false))
    }
    if (tab === 'payouts' && payouts === null) {
      setTabLoading(true)
      getMyPayouts()
        .then(setPayouts)
        .catch(() => setPayouts([]))
        .finally(() => setTabLoading(false))
    }
    if (tab === 'attendance' && attendanceEvents === null) {
      setTabLoading(true)
      getAttendanceEvents()
        .then(setAttendanceEvents)
        .catch(() => setAttendanceEvents([]))
        .finally(() => setTabLoading(false))
    }
  }, [profile, tab, referrals, team, payouts, attendanceEvents])

  const referralLink = qr?.link ?? (profile ? buildReferralLink(profile.zone.referral_code) : '')

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Join me at TRFC - Kenya's fitness and wellness community! Sign up with our ${profile?.zone.name ?? ''} zone link: ${referralLink}`
  )}`

  const totalPages = commissions ? Math.max(1, Math.ceil(commissions.total / PAGE_SIZE)) : 1

  return (
    <>
      <MemberPageHeader
        title="CAPTAIN"
        highlight="DASHBOARD"
        subtitle={
          profile && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/15 light:bg-accent-light/15 border border-accent/30 light:border-accent-light/30 text-accent light:text-accent-light font-barlow-condensed font-bold text-xs tracking-widest uppercase">
                <MapPin size={12} /> {profile.zone.name} · {profile.zone.code}
              </span>
              {profile.zone.is_lead && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/15 light:bg-accent-light/15 border border-accent/30 light:border-accent-light/30 text-accent light:text-accent-light font-barlow-condensed font-bold text-xs tracking-widest uppercase">
                  <Crown size={12} /> Lead captain
                </span>
              )}
              <span>
                The {profile.zone.name} zone earns {formatRate(profile.zone.commission_rate)} on referred purchases
              </span>
            </div>
          )
        }
      />

      <div className="space-y-8">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader className="w-10 h-10 animate-spin text-accent light:text-accent-light" />
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 flex gap-3 text-red-300 text-sm">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {profile && (
          <>
            <div className={`${cardSurface} p-6 grid gap-6 md:grid-cols-[1fr_auto] items-center`}>
              <div className="min-w-0">
                <h2 className="font-barlow-condensed font-bold text-xl tracking-tighter mb-1">Your zone&apos;s referral link</h2>
                <p className="text-sm text-fog light:text-fog-light mb-4">
                  Every captain in {profile.zone.name} shares this link. Everyone who signs up with it joins the zone,
                  and the zone earns on every product, event ticket, medal and equipment hire they buy. Earnings go to
                  the {profile.zone.name} zone and are paid to{' '}
                  {profile.zone.is_lead ? 'you as the lead captain' : profile.zone.lead_captain_name ?? 'the zone’s lead captain'}.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    readOnly
                    value={referralLink}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 min-w-0 bg-smoke light:bg-smoke-light border border-white/10 light:border-black/10 px-3 py-2.5 text-sm text-chalk light:text-chalk-light"
                    aria-label="Referral link"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cta text-cta-ink font-barlow-condensed font-bold text-sm tracking-widest uppercase"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white font-barlow-condensed font-bold text-sm tracking-widest uppercase no-underline"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                </div>
                <p className="mt-3 text-xs text-fog light:text-fog-light">
                  Zone referral code: <strong className="text-chalk light:text-chalk-light tracking-wider">{profile.zone.referral_code}</strong>
                </p>
              </div>
              {qr && (
                <div className="flex flex-col items-center gap-2">
                  <img src={qr.dataUrl} alt="Referral QR code" className="w-36 h-36 bg-white p-1" />
                  <a
                    href={qr.dataUrl}
                    download={`trfc-referral-${profile.zone.referral_code}.png`}
                    className="inline-flex items-center gap-1.5 text-xs text-accent light:text-accent-light no-underline hover:underline"
                  >
                    <Download size={12} /> Download QR
                  </a>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatTile label="Your team" value={profile.stats.team_members ?? 0} icon={UsersRound} />
              <StatTile label="Zone referrals" value={profile.stats.referred_customers} icon={Users} />
              <StatTile label="Zone sales" value={formatKes(profile.stats.referred_sales)} icon={TrendingUp} />
              <StatTile label="Zone pending" value={formatKes(profile.stats.pending_amount)} icon={Clock} />
              <StatTile label="Zone approved" value={formatKes(profile.stats.approved_amount)} icon={BadgeCheck} />
              <StatTile label="Zone paid out" value={formatKes(profile.stats.paid_amount)} icon={Wallet} />
            </div>

            <div>
              <DashboardTabs tabs={TAB_LABELS} active={tab} onChange={setTab} />

              {tabLoading && (
                <div className="flex justify-center py-10">
                  <Loader className="w-8 h-8 animate-spin text-accent light:text-accent-light" />
                </div>
              )}

              {!tabLoading && tab === 'commissions' && commissions && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <select
                      value={commissionStatus}
                      onChange={(e) => {
                        setCommissionStatus(e.target.value as CommissionStatus | '')
                        setCommissionPage(1)
                      }}
                      className="bg-smoke light:bg-smoke-light border border-white/10 light:border-black/10 px-3 py-2 text-sm text-chalk light:text-chalk-light"
                      aria-label="Filter by status"
                    >
                      <option value="">All statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="paid">Paid</option>
                      <option value="reversed">Reversed</option>
                    </select>
                  </div>
                  {commissions.commissions.length === 0 ? (
                    <p className="text-center py-10 text-fog light:text-fog-light">
                      No zone commissions yet. Share the zone link to start earning.
                    </p>
                  ) : (
                    commissions.commissions.map((c) => (
                      <div key={c.id} className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-center`}>
                        <div>
                          <p className="font-barlow-condensed font-bold text-lg">{SOURCE_LABELS[c.source_type]}</p>
                          <p className="text-sm text-fog light:text-fog-light">
                            {c.source_type === 'event_share'
                              ? `${c.event_title ?? 'Event'} · ${formatDate(c.created_at)} · ${c.used_tickets ?? 0} used referral ticket${
                                  c.used_tickets === 1 ? '' : 's'
                                }`
                              : `${c.customer_name} · ${formatDate(c.created_at)} · ${formatKes(c.base_amount)} purchase`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bebas text-2xl text-accent light:text-accent-light">{formatKes(c.amount)}</p>
                          <span className={`inline-block px-2.5 py-0.5 text-xs font-bold uppercase ${COMMISSION_STATUS_STYLES[c.status]}`}>
                            {c.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-3 text-sm">
                      <button
                        type="button"
                        disabled={commissionPage <= 1}
                        onClick={() => setCommissionPage((p) => p - 1)}
                        className="px-3 py-1.5 border border-white/10 light:border-black/10 disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span className="text-fog light:text-fog-light">
                        Page {commissionPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={commissionPage >= totalPages}
                        onClick={() => setCommissionPage((p) => p + 1)}
                        className="px-3 py-1.5 border border-white/10 light:border-black/10 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!tabLoading && tab === 'referrals' && referrals && (
                <div className="space-y-3">
                  {referrals.length === 0 ? (
                    <p className="text-center py-10 text-fog light:text-fog-light">No one has signed up with the zone link yet.</p>
                  ) : (
                    referrals.map((r) => (
                      <div key={r.id} className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-center`}>
                        <div>
                          <p className="font-barlow-condensed font-bold text-lg">{r.name}</p>
                          <p className="text-sm text-fog light:text-fog-light">Joined {formatDate(r.referred_at)}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-chalk light:text-chalk-light">
                            {r.purchases} purchase{r.purchases === 1 ? '' : 's'} · {formatKes(r.total_spent)}
                          </p>
                          <p className="text-accent light:text-accent-light">Zone earned {formatKes(r.commission_earned)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {!tabLoading && tab === 'team' && team && (
                <div className="space-y-3">
                  <p className="text-sm text-fog light:text-fog-light">
                    Members who chose you as their captain. Their purchases earn for the zone only if they joined with a zone link.
                  </p>
                  {team.length === 0 ? (
                    <p className="text-center py-10 text-fog light:text-fog-light">No team members yet.</p>
                  ) : (
                    team.map((member) => (
                      <div key={member.id} className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-center`}>
                        <div>
                          <p className="font-barlow-condensed font-bold text-lg">{member.name}</p>
                          <p className="text-sm text-fog light:text-fog-light">Joined {formatDate(member.joined_at)}</p>
                        </div>
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-barlow-condensed font-bold tracking-widest uppercase border ${
                            member.joined_via === 'zone_link'
                              ? 'bg-accent/15 light:bg-accent-light/15 border-accent/30 light:border-accent-light/30 text-accent light:text-accent-light'
                              : 'bg-white/5 light:bg-black/5 border-white/10 light:border-black/10 text-fog light:text-fog-light'
                          }`}
                        >
                          {member.joined_via === 'zone_link' ? 'Joined with zone link' : 'Chose you'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {!tabLoading && tab === 'payouts' && payouts && (
                <div className="space-y-3">
                  {payouts.length === 0 ? (
                    <p className="text-center py-10 text-fog light:text-fog-light">
                      No zone payouts yet. Approved commissions are paid to the lead captain&apos;s M-Pesa
                      {profile.zone.is_lead && profile.payout_phone ? ` (${profile.payout_phone})` : ''}.
                    </p>
                  ) : (
                    payouts.map((p) => (
                      <div key={p.id} className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-center`}>
                        <div>
                          <p className="font-barlow-condensed font-bold text-lg">{formatKes(p.amount)}</p>
                          <p className="text-sm text-fog light:text-fog-light">
                            {formatDate(p.paid_at)} · {p.commission_count} commission{p.commission_count === 1 ? '' : 's'}
                            {p.paid_to_name ? ` · Paid to ${p.paid_to_name}` : ''}
                            {p.note ? ` · ${p.note}` : ''}
                          </p>
                        </div>
                        <span className="text-sm font-mono text-chalk light:text-chalk-light">{p.mpesa_receipt || '—'}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
              {!tabLoading && tab === 'attendance' && attendanceEvents && (
                <div className="space-y-3">
                  <p className="text-sm text-fog light:text-fog-light">
                    Events in your zone. After an event, confirm the scan list; anyone who came but wasn't scanned can be
                    marked present for 48 hours.
                  </p>
                  {attendanceEvents.length === 0 ? (
                    <p className="text-center py-10 text-fog light:text-fog-light">No recent events in your zone.</p>
                  ) : (
                    attendanceEvents.map((ev) => (
                      <div key={ev.id} className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-center`}>
                        <div>
                          <p className="font-barlow-condensed font-bold text-lg">{ev.title}</p>
                          <p className="text-sm text-fog light:text-fog-light">
                            {formatDate(ev.event_date)} · {ev.scanned}/{ev.paid} scanned
                            {ev.cancelled_at
                              ? ' · Cancelled by TRFC'
                              : ev.scan_list_confirmed_at
                                ? ` · Confirmed · ${ev.no_shows} no-show${ev.no_shows === 1 ? '' : 's'}`
                                : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setScanEventId(ev.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 light:border-black/10 font-barlow-condensed font-bold text-sm tracking-widest uppercase"
                        >
                          <ClipboardCheck size={14} /> Scan list
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {scanEventId && (
        <ScanListPanel
          eventId={scanEventId}
          tone="member"
          onClose={() => setScanEventId(null)}
          onChanged={() => getAttendanceEvents().then(setAttendanceEvents).catch(() => undefined)}
        />
      )}
    </>
  )
}
