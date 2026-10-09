import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  Loader,
  MapPin,
  MessageCircle,
  Users,
  Wallet,
  TrendingUp,
  Clock,
  BadgeCheck,
} from 'lucide-react'
import { pageRoot, cardSurface } from '../utils/themeClasses'
import {
  getMyCaptainProfile,
  getMyCommissions,
  getMyPayouts,
  getMyReferralQr,
  getMyReferrals,
  SOURCE_LABELS,
  type CaptainCommissionPage,
  type CaptainPayout,
  type CaptainProfile,
  type CaptainReferral,
  type CommissionStatus,
} from '../api/captains'
import { buildReferralLink } from '../utils/referral'
import { COMMISSION_STATUS_STYLES, formatDate, formatKes, formatRate } from '../utils/captainDisplay'

type Tab = 'commissions' | 'referrals' | 'payouts'

const PAGE_SIZE = 20

function StatTile({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) {
  return (
    <div className={`${cardSurface} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light">
          {label}
        </span>
        <Icon size={16} className="text-accent light:text-accent-light" />
      </div>
      <p className="font-bebas text-3xl text-chalk light:text-chalk-light">{value}</p>
    </div>
  )
}

export default function CaptainDashboard() {
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
  const [payouts, setPayouts] = useState<CaptainPayout[] | null>(null)
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
    if (tab === 'payouts' && payouts === null) {
      setTabLoading(true)
      getMyPayouts()
        .then(setPayouts)
        .catch(() => setPayouts([]))
        .finally(() => setTabLoading(false))
    }
  }, [profile, tab, referrals, payouts])

  const referralLink = qr?.link ?? (profile ? buildReferralLink(profile.referral_code) : '')

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
    `Join me at TRFC - Kenya's fitness and wellness community! Sign up with my link: ${referralLink}`
  )}`

  const totalPages = commissions ? Math.max(1, Math.ceil(commissions.total / PAGE_SIZE)) : 1

  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11">
        <div className="max-w-5xl mx-auto">
          <Link
            to="/account"
            className="inline-flex items-center gap-2 text-accent light:text-accent-light text-sm mb-4 no-underline hover:underline"
          >
            <ArrowLeft size={14} /> Account
          </Link>
          <h1 className="font-bebas text-5xl text-chalk light:text-chalk-light">
            CAPTAIN <span className="text-accent light:text-accent-light">DASHBOARD</span>
          </h1>
          {profile && (
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="text-chalk light:text-chalk-light font-barlow-condensed font-bold text-lg">{profile.name}</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/15 light:bg-accent-light/15 border border-accent/30 light:border-accent-light/30 text-accent light:text-accent-light font-barlow-condensed font-bold text-xs tracking-widest uppercase">
                <MapPin size={12} /> {profile.region_name} · {profile.region_code}
              </span>
              <span className="text-sm text-fog light:text-fog-light">
                Earning {formatRate(profile.commission_rate)} on referred purchases
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-[6%] py-10 pb-20 space-y-8">
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
                <h2 className="font-barlow-condensed font-bold text-xl tracking-tighter mb-1">Your referral link</h2>
                <p className="text-sm text-fog light:text-fog-light mb-4">
                  Share this link. Everyone who signs up with it is linked to you, and you earn on every product,
                  medal and equipment hire they buy.
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
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent light:bg-accent-light text-black light:text-white font-barlow-condensed font-bold text-sm tracking-widest uppercase"
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
                  Referral code: <strong className="text-chalk light:text-chalk-light tracking-wider">{profile.referral_code}</strong>
                </p>
              </div>
              {qr && (
                <div className="flex flex-col items-center gap-2">
                  <img src={qr.dataUrl} alt="Referral QR code" className="w-36 h-36 bg-white p-1" />
                  <a
                    href={qr.dataUrl}
                    download={`trfc-referral-${profile.referral_code}.png`}
                    className="inline-flex items-center gap-1.5 text-xs text-accent light:text-accent-light no-underline hover:underline"
                  >
                    <Download size={12} /> Download QR
                  </a>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatTile label="Referred customers" value={profile.stats.referred_customers} icon={Users} />
              <StatTile label="Referred sales" value={formatKes(profile.stats.referred_sales)} icon={TrendingUp} />
              <StatTile label="Pending" value={formatKes(profile.stats.pending_amount)} icon={Clock} />
              <StatTile label="Approved" value={formatKes(profile.stats.approved_amount)} icon={BadgeCheck} />
              <StatTile label="Paid out" value={formatKes(profile.stats.paid_amount)} icon={Wallet} />
            </div>

            <div>
              <div className="flex gap-1 border-b border-white/10 light:border-black/10 mb-5" role="tablist">
                {(['commissions', 'referrals', 'payouts'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-2.5 font-barlow-condensed font-bold text-sm tracking-widest uppercase border-b-2 -mb-px transition ${
                      tab === t
                        ? 'border-accent light:border-accent-light text-accent light:text-accent-light'
                        : 'border-transparent text-fog light:text-fog-light hover:text-chalk light:hover:text-chalk-light'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

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
                      No commissions yet. Share your link to start earning.
                    </p>
                  ) : (
                    commissions.commissions.map((c) => (
                      <div key={c.id} className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-center`}>
                        <div>
                          <p className="font-barlow-condensed font-bold text-lg">{SOURCE_LABELS[c.source_type]}</p>
                          <p className="text-sm text-fog light:text-fog-light">
                            {c.customer_name} · {formatDate(c.created_at)} · {formatKes(c.base_amount)} purchase
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
                    <p className="text-center py-10 text-fog light:text-fog-light">No one has signed up with your link yet.</p>
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
                          <p className="text-accent light:text-accent-light">You earned {formatKes(r.commission_earned)}</p>
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
                      No payouts yet. Approved commissions are paid to your M-Pesa
                      {profile.payout_phone ? ` (${profile.payout_phone})` : ''}.
                    </p>
                  ) : (
                    payouts.map((p) => (
                      <div key={p.id} className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-center`}>
                        <div>
                          <p className="font-barlow-condensed font-bold text-lg">{formatKes(p.amount)}</p>
                          <p className="text-sm text-fog light:text-fog-light">
                            {formatDate(p.paid_at)} · {p.commission_count} commission{p.commission_count === 1 ? '' : 's'}
                            {p.note ? ` · ${p.note}` : ''}
                          </p>
                        </div>
                        <span className="text-sm font-mono text-chalk light:text-chalk-light">{p.mpesa_receipt || '—'}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
