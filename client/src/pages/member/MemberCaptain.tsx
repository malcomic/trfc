import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
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
  ScanLine,
  Search,
  Link2,
  UserPlus,
  UserX,
} from 'lucide-react'
import { cardSurface } from '../../utils/themeClasses'
import { useAuth } from '../../context/AuthContext'
import {
  exportMyTeam,
  getMyCaptainProfile,
  getMyCommissions,
  getMyLinkStats,
  getMyPayouts,
  getMyReferralQr,
  getMyReferrals,
  getMyTeam,
  getMyZoneOverview,
  MEMBER_STATUS_OPTIONS,
  SOURCE_LABELS,
  type CaptainCommissionPage,
  type CaptainLinkStats,
  type CaptainPayout,
  type CaptainProfile,
  type CaptainReferral,
  type CaptainTeamExportRow,
  type CaptainTeamMember,
  type CaptainZoneOverview,
  type CommissionStatus,
  type MemberStatus,
} from '../../api/captains'
import { downloadCsv } from '../../utils/csv'
import { buildReferralLink } from '../../utils/referral'
import { COMMISSION_STATUS_STYLES, formatDate, formatKes, formatRate } from '../../utils/captainDisplay'
import StatTile from '../../components/dashboard/StatTile'
import DashboardTabs from '../../components/dashboard/DashboardTabs'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import ScanListPanel from '../../components/attendance/ScanListPanel'
import CaptainPhotoCard from '../../components/captain/CaptainPhotoCard'
import { getAttendanceEvents, type AttendanceEvent } from '../../api/attendance'
import { coreProgramName } from '../../content/programs'

type Tab = 'commissions' | 'referrals' | 'team' | 'payouts' | 'attendance'

const TAB_LABELS: Record<Tab, string> = {
  commissions: 'Commissions',
  referrals: 'Referrals',
  team: 'Team members',
  payouts: 'Payouts',
  attendance: 'Scan lists',
}

const COMING_SOON_TABS = ['Finish times', 'Free program', 'Events', 'Messages and notes']

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

const STATUS_BADGE_STYLES: Record<MemberStatus, string> = {
  new: 'bg-sky-500/15 border-sky-500/30 text-sky-300 light:text-sky-700',
  active: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 light:text-emerald-700',
  missing: 'bg-amber-500/15 border-amber-500/30 text-amber-300 light:text-amber-700',
}

function statusLabel(status: MemberStatus, missed: number): string {
  if (status === 'missing') return `Missing - ${missed} Saturday${missed === 1 ? '' : 's'}`
  return status === 'new' ? 'New' : 'Active'
}

function percent(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—'
}

function exportRowsForCsv(rows: CaptainTeamExportRow[]) {
  return rows.map((r) => ({
    Name: r.name,
    Status: statusLabel(r.status, r.missed_saturdays),
    'Saturdays attended': r.saturdays_attended,
    'Last seen': r.last_seen ?? '',
    Joined: r.signed_up_at ? r.signed_up_at.slice(0, 10) : '',
  }))
}

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
  const [overview, setOverview] = useState<CaptainZoneOverview | null>(null)
  const [linkStats, setLinkStats] = useState<CaptainLinkStats | null>(null)
  const [teamSearch, setTeamSearch] = useState('')
  const [teamQuery, setTeamQuery] = useState('')
  const [teamStatus, setTeamStatus] = useState<MemberStatus | ''>('')
  const [teamAction, setTeamAction] = useState<'' | 'copy' | 'export'>('')
  const [teamNotice, setTeamNotice] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMyCaptainProfile()
        setProfile(data)
        getMyReferralQr(window.location.origin)
          .then(setQr)
          .catch(() => setQr(null))
        getMyZoneOverview()
          .then(setOverview)
          .catch(() => setOverview(null))
        getMyLinkStats(30)
          .then(setLinkStats)
          .catch(() => setLinkStats(null))
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
  }, [profile, tab, referrals, payouts, attendanceEvents])

  useEffect(() => {
    const timer = window.setTimeout(() => setTeamQuery(teamSearch.trim()), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [teamSearch])

  useEffect(() => {
    if (!profile || tab !== 'team') return
    let cancelled = false
    setTeam(null)
    getMyTeam({ q: teamQuery || undefined, status: teamStatus || undefined })
      .then((list) => !cancelled && setTeam(list))
      .catch(() => !cancelled && setTeam([]))
    return () => {
      cancelled = true
    }
  }, [profile, tab, teamQuery, teamStatus])

  const runTeamExport = async (action: 'copy' | 'export') => {
    setTeamAction(action)
    setTeamNotice('')
    try {
      const rows = await exportMyTeam(action, { q: teamQuery || undefined, status: teamStatus || undefined })
      if (action === 'export') {
        downloadCsv(`trfc-${profile?.zone.code.toLowerCase() ?? 'zone'}-members`, exportRowsForCsv(rows))
        setTeamNotice(`Exported ${rows.length} member${rows.length === 1 ? '' : 's'}`)
      } else {
        const text = exportRowsForCsv(rows)
          .map((r) => [r.Name, r.Status, `${r['Saturdays attended']} Saturdays`, r['Last seen'] ? `last seen ${r['Last seen']}` : 'never seen'].join(' · '))
          .join('\n')
        await navigator.clipboard.writeText(text)
        setTeamNotice(`Copied ${rows.length} member${rows.length === 1 ? '' : 's'}`)
      }
    } catch {
      setTeamNotice(action === 'copy' ? 'Could not copy the list' : 'Could not export the list')
    } finally {
      setTeamAction('')
    }
  }

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
  const activeCaptains = Math.max(1, profile?.stats.active_captains ?? 1)
  const shareOf = (amount: number) => (activeCaptains === 1 ? amount : Math.floor(amount / activeCaptains))

  return (
    <>
      <MemberPageHeader
        title="CAPTAIN"
        highlight="DASHBOARD"
        actions={
          <Link
            to="/dashboard/captain/scan"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-cta text-cta-ink font-barlow-condensed font-bold text-sm tracking-widest uppercase no-underline"
          >
            <ScanLine size={14} /> Scan members
          </Link>
        }
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
                You earn {formatRate(profile.zone.commission_rate)} on shop purchases by members who chose you
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
            {overview && <ZoneOverviewCard overview={overview} zoneName={profile.zone.name} />}

            <CaptainPhotoCard
              name={profile.name.trim().split(/\s+/)[0] || 'Captain'}
              photoUrl={profile.photo_url}
              onChanged={(photoUrl) => setProfile((p) => (p ? { ...p, photo_url: photoUrl } : p))}
            />

            <div className={`${cardSurface} p-6 grid gap-6 md:grid-cols-[1fr_auto] items-center`}>
              <div className="min-w-0">
                <h2 className="font-barlow-condensed font-bold text-xl tracking-tighter mb-1">Your zone&apos;s referral link</h2>
                <p className="text-sm text-fog light:text-fog-light mb-4">
                  Every captain in {profile.zone.name} shares this link. Everyone who signs up with it joins the zone and
                  chooses their captain. You earn on every product, medal and equipment hire bought by members who chose
                  you, and that commission is yours alone. Event tickets earn through each event&apos;s profit share, which
                  goes to the {profile.zone.name} zone and is shared equally by its{' '}
                  {activeCaptains === 1 ? 'captain' : `${activeCaptains} active captains`}.
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

            {linkStats && <LinkStatsCard stats={linkStats} />}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatTile label="Members who chose you" value={profile.stats.team_members ?? 0} icon={UsersRound} />
              <StatTile label="Zone referrals" value={profile.stats.referred_customers} icon={Users} />
              <StatTile label="Your pending" value={formatKes(profile.stats.my_pending_amount ?? 0)} icon={Clock} />
              <StatTile label="Your approved" value={formatKes(profile.stats.my_approved_amount ?? 0)} icon={BadgeCheck} />
              <StatTile label="Zone shares pending" value={formatKes(profile.stats.zone_pending_amount ?? 0)} icon={TrendingUp} />
              <StatTile
                label="Your share of zone approved"
                value={formatKes(shareOf(profile.stats.zone_approved_amount ?? 0))}
                icon={BadgeCheck}
              />
              <StatTile label="Zone paid out" value={formatKes(profile.stats.zone_paid_amount ?? 0)} icon={Wallet} />
              <StatTile label="Paid to you" value={formatKes(profile.stats.my_paid_amount ?? 0)} icon={Wallet} />
            </div>
            {activeCaptains > 1 && (
              <p className="-mt-4 text-xs text-fog light:text-fog-light">
                Your own commissions are paid to you in full. Your share of zone money is an estimate: it is split
                equally between the zone&apos;s {activeCaptains} active captains when it is paid, in whole shillings.
              </p>
            )}

            <div>
              <DashboardTabs tabs={TAB_LABELS} active={tab} onChange={setTab} comingSoon={COMING_SOON_TABS} />

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
                      No commissions yet. Share the zone link and look after your members to start earning.
                    </p>
                  ) : (
                    commissions.commissions.map((c) => (
                      <div key={c.id} className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-center`}>
                        <div>
                          <p className="font-barlow-condensed font-bold text-lg">
                            {SOURCE_LABELS[c.source_type]}
                            <span className="ml-2 text-xs font-normal text-fog light:text-fog-light">
                              {c.kind === 'zone' ? 'Zone share' : 'Yours'}
                            </span>
                          </p>
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
                          {c.kind === 'zone' && activeCaptains > 1 && (c.status === 'pending' || c.status === 'approved') && (
                            <p className="text-xs text-fog light:text-fog-light">Your share about {formatKes(shareOf(c.amount))}</p>
                          )}
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
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'team' && (
                <div className="space-y-3">
                  <p className="text-sm text-fog light:text-fog-light">
                    Members in your zone and members who chose you. Follow up with them through the TRFC app. You see a WhatsApp
                    button only while that member has turned it on for you, and it must never be used for promotions. Copying
                    or exporting the list is recorded.
                  </p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <label className="relative flex-1 min-w-[12rem]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog light:text-fog-light" />
                      <input
                        type="search"
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        placeholder="Search by name"
                        aria-label="Search members by name"
                        className="w-full bg-smoke light:bg-smoke-light border border-white/10 light:border-black/10 pl-9 pr-3 py-2 text-sm text-chalk light:text-chalk-light"
                      />
                    </label>
                    <select
                      value={teamStatus}
                      onChange={(e) => setTeamStatus(e.target.value as MemberStatus | '')}
                      className="bg-smoke light:bg-smoke-light border border-white/10 light:border-black/10 px-3 py-2 text-sm text-chalk light:text-chalk-light"
                      aria-label="Filter by status"
                    >
                      <option value="">All statuses</option>
                      {MEMBER_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={teamAction !== ''}
                      onClick={() => void runTeamExport('copy')}
                      className="inline-flex items-center gap-2 px-3 py-2 border border-white/10 light:border-black/10 font-barlow-condensed font-bold text-sm tracking-widest uppercase disabled:opacity-50"
                    >
                      <Copy size={14} /> Copy list
                    </button>
                    <button
                      type="button"
                      disabled={teamAction !== ''}
                      onClick={() => void runTeamExport('export')}
                      className="inline-flex items-center gap-2 px-3 py-2 border border-white/10 light:border-black/10 font-barlow-condensed font-bold text-sm tracking-widest uppercase disabled:opacity-50"
                    >
                      <Download size={14} /> Export CSV
                    </button>
                  </div>
                  {teamNotice && <p className="text-xs text-fog light:text-fog-light">{teamNotice}</p>}
                  {team === null ? (
                    <div className="flex justify-center py-10">
                      <Loader className="w-8 h-8 animate-spin text-accent light:text-accent-light" />
                    </div>
                  ) : team.length === 0 ? (
                    <p className="text-center py-10 text-fog light:text-fog-light">
                      {teamQuery || teamStatus ? 'No members match these filters.' : 'No team members yet.'}
                    </p>
                  ) : (
                    team.map((member) => (
                      <div key={member.id} className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-start`}>
                        <div className="min-w-0 space-y-1">
                          <p className="font-barlow-condensed font-bold text-lg flex flex-wrap items-center gap-2">
                            {member.name}
                            <span
                              className={`inline-block px-2 py-0.5 text-xs font-barlow-condensed font-bold tracking-widest uppercase border ${
                                STATUS_BADGE_STYLES[member.status]
                              }`}
                            >
                              {statusLabel(member.status, member.missed_saturdays)}
                            </span>
                          </p>
                          <p className="text-sm text-fog light:text-fog-light">
                            {member.zone ?? 'No zone'} · Joined {formatDate(member.joined_at)} · {member.saturdays_attended} Saturday
                            {member.saturdays_attended === 1 ? '' : 's'} · Last seen{' '}
                            {member.last_seen ? formatDate(member.last_seen) : 'never'}
                          </p>
                          {member.programs.length > 0 && (
                            <ul className="text-sm text-fog light:text-fog-light">
                              {member.programs.map((p) => (
                                <li key={p.program}>
                                  {coreProgramName(p.program)}: {p.sessions_done} session{p.sessions_done === 1 ? '' : 's'} done,{' '}
                                  {p.weeks_checked_in} week{p.weeks_checked_in === 1 ? '' : 's'} checked in
                                  {p.status !== 'active' ? ` (${p.status})` : ''}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`inline-block px-2.5 py-1 text-xs font-barlow-condensed font-bold tracking-widest uppercase border ${
                              member.is_my_member
                                ? 'bg-accent/15 light:bg-accent-light/15 border-accent/30 light:border-accent-light/30 text-accent light:text-accent-light'
                                : 'bg-white/5 light:bg-black/5 border-white/10 light:border-black/10 text-fog light:text-fog-light'
                            }`}
                          >
                            {member.is_my_member ? 'Chose you' : member.joined_via === 'zone_link' ? 'Joined with zone link' : 'In your zone'}
                          </span>
                          {member.whatsapp && (
                            <a
                              href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-accent light:text-accent-light no-underline hover:underline"
                            >
                              <MessageCircle size={14} /> WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {!tabLoading && tab === 'payouts' && payouts && (
                <div className="space-y-3">
                  {payouts.length === 0 ? (
                    <p className="text-center py-10 text-fog light:text-fog-light">
                      No payouts yet. Your approved commissions are paid to you in full, and zone money is shared equally
                      by the zone&apos;s active captains. Payments go to your M-Pesa
                      {profile.payout_phone ? ` (${profile.payout_phone})` : ''}.
                    </p>
                  ) : (
                    payouts.map((p) => (
                      <div key={p.id} className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-center`}>
                        <div>
                          <p className="font-barlow-condensed font-bold text-lg">
                            {p.my_amount !== null ? `You got ${formatKes(p.my_amount)}` : 'Not shared with you'}
                          </p>
                          <p className="text-sm text-fog light:text-fog-light">
                            {formatDate(p.paid_at)} ·{' '}
                            {p.personal
                              ? 'Your commissions'
                              : `Zone got ${formatKes(p.amount)}${
                                  p.captain_count > 0 ? `, split by ${p.captain_count} captain${p.captain_count === 1 ? '' : 's'}` : ''
                                }`}
                            {' · '}
                            {p.commission_count} commission{p.commission_count === 1 ? '' : 's'}
                            {p.note ? ` · ${p.note}` : ''}
                          </p>
                        </div>
                        <span className="text-sm font-mono text-chalk light:text-chalk-light">{p.my_receipt || '—'}</span>
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

function ZoneOverviewCard({ overview, zoneName }: { overview: CaptainZoneOverview; zoneName: string }) {
  const maxAttended = Math.max(1, ...overview.last_four_saturdays.map((s) => s.attended))
  return (
    <div className={`${cardSurface} p-6 space-y-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-barlow-condensed font-bold text-xl tracking-tighter">{zoneName} zone overview</h2>
        <p className="text-xs text-fog light:text-fog-light">
          {overview.new_count} new · {overview.active_count} active · {overview.missing_count} missing
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-[1fr_auto] items-end">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatTile
            label={`Members · +${overview.joined_this_week} this week`}
            value={overview.total_members}
            icon={Users}
          />
          <StatTile label="Joined with the zone link" value={overview.joined_via_link} icon={UserPlus} />
          <StatTile label="No captain yet" value={overview.no_captain_count} icon={UserX} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-fog light:text-fog-light mb-2">Last four Saturdays</p>
          {overview.last_four_saturdays.length === 0 ? (
            <p className="text-sm text-fog light:text-fog-light">No Saturday runs yet.</p>
          ) : (
            <div className="flex items-end gap-3 h-28">
              {overview.last_four_saturdays.map((s) => (
                <div key={s.date} className="flex flex-col items-center justify-end gap-1 h-full w-12">
                  <span className="text-xs font-bold">{s.attended}</span>
                  <div
                    className="w-full bg-accent light:bg-accent-light"
                    style={{ height: `${Math.max(4, (s.attended / maxAttended) * 64)}px` }}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] text-fog light:text-fog-light whitespace-nowrap">
                    {new Date(`${s.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LinkStatsCard({ stats }: { stats: CaptainLinkStats }) {
  const rows = [
    { label: `Last ${stats.days} days`, opened: stats.opened, finished: stats.finished },
    { label: 'All time', opened: stats.opened_total, finished: stats.finished_total },
  ]
  return (
    <div className={`${cardSurface} p-6`}>
      <h2 className="font-barlow-condensed font-bold text-xl tracking-tighter mb-1 flex items-center gap-2">
        <Link2 size={18} /> Zone link results
      </h2>
      <p className="text-sm text-fog light:text-fog-light mb-4">
        Opened counts each browser once a day. Finished counts people who signed up with the zone link.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="border border-white/10 light:border-black/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-fog light:text-fog-light mb-2">{r.label}</p>
            <div className="flex gap-6">
              <div>
                <p className="font-bebas text-3xl">{r.opened}</p>
                <p className="text-xs text-fog light:text-fog-light">Opened</p>
              </div>
              <div>
                <p className="font-bebas text-3xl">{r.finished}</p>
                <p className="text-xs text-fog light:text-fog-light">Finished</p>
              </div>
              <div>
                <p className="font-bebas text-3xl text-accent light:text-accent-light">{percent(r.finished, r.opened)}</p>
                <p className="text-xs text-fog light:text-fog-light">Conversion</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
