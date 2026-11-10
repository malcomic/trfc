import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader } from 'lucide-react'
import {
  getMyMembership,
  getShopDiscount,
  startMembershipCheckout,
  type MyMembership,
  type ShopDiscount,
} from '../../api/membership'
import {
  MEMBERSHIP_COPY,
  foundingLine,
  kes,
  memberDate,
  quoteLine,
  renewalState,
} from '../../content/membership'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import MemberBadge from '../../components/member/membership/MemberBadge'
import PerkList from '../../components/member/membership/PerkList'
import PaymentStatusModal from '../../components/PaymentStatusModal'
import CtaButton from '../../components/programs/CtaButton'
import { dashCard, dashHeading, dashMuted } from '../../components/member/dashboard/ui'
import { inputField } from '../../utils/themeClasses'
import { toKenyanMsisdn } from '../../utils/phone'

const copy = MEMBERSHIP_COPY

function PriceBox({
  membership,
  heading,
  note,
  onPaid,
  onRefresh,
}: {
  membership: MyMembership
  heading: string
  note?: string
  onPaid: () => void
  onRefresh: () => void
}) {
  const { quote, founding, pending } = membership
  const [phone, setPhone] = useState(membership.phone ?? '')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [checkout, setCheckout] = useState<{ id: string; phone: string } | null>(null)

  const pay = async () => {
    setError('')
    const msisdn = toKenyanMsisdn(phone)
    if (!msisdn) {
      setError('Enter a Safaricom number, for example 0712 345 678.')
      return
    }
    setSending(true)
    try {
      const result = await startMembershipCheckout(msisdn)
      setCheckout({ id: result.checkoutRequestId, phone: msisdn })
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not send the M-Pesa prompt. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const founderNote = quote.priceType === 'founding' ? foundingLine(founding.left, founding.limit, founding.deadline) : null

  return (
    <div className={`${dashCard} border-cta/40 light:border-cta`}>
      <h2 className={dashHeading}>{heading}</h2>
      <p className="font-bebas text-4xl text-chalk light:text-chalk-light mt-2">{kes(quote.amount)}</p>
      <p className="font-barlow font-semibold text-chalk light:text-chalk-light">{quoteLine(quote)}</p>
      <p className={`${dashMuted} mt-1`}>{copy.price.year(memberDate(quote.startsAt), memberDate(quote.endsAt))}</p>
      {note && <p className={`${dashMuted} mt-1`}>{note}</p>}
      {founderNote && <p className="mt-2 text-sm font-semibold text-cta light:text-chalk-light">{founderNote}</p>}

      {!quote.available ? (
        <div className="mt-5">
          <CtaButton disabled>
            {quote.reason === 'paused' ? copy.price.paused : copy.price.opens(memberDate(membership.salesOpenAt, false))}
          </CtaButton>
        </div>
      ) : pending ? (
        <div className="mt-5 space-y-3">
          <p className={dashMuted}>{copy.price.waiting}</p>
          <CtaButton size="sm" onClick={() => setCheckout({ id: pending.checkoutRequestId, phone: membership.phone ?? '' })}>
            {copy.price.checkWaiting}
          </CtaButton>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="block text-sm font-semibold text-chalk light:text-chalk-light mb-1">{copy.price.phoneLabel}</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`${inputField} w-full rounded-lg px-4 py-3`}
              placeholder="0712 345 678"
            />
            <span className={`${dashMuted} block mt-1`}>{copy.price.phoneHelp}</span>
          </label>
          {error && (
            <p role="alert" className="flex items-start gap-2 text-sm text-red-400 light:text-red-700">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
            </p>
          )}
          <CtaButton onClick={pay} disabled={sending} className="w-full sm:w-auto">
            {sending ? copy.price.paying : copy.price.pay(kes(quote.amount))}
          </CtaButton>
        </div>
      )}

      {checkout && (
        <PaymentStatusModal
          isOpen
          checkoutRequestId={checkout.id}
          phone={checkout.phone}
          successBody={copy.success.body}
          messages={copy.pollMessages}
          onSuccess={onPaid}
          onClose={() => {
            setCheckout(null)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}

function History({ membership }: { membership: MyMembership }) {
  return (
    <div className={dashCard}>
      <h2 className={`${dashHeading} mb-3`}>{copy.history.heading}</h2>
      {membership.history.length === 0 ? (
        <p className={dashMuted}>{copy.history.empty}</p>
      ) : (
        <ul className="divide-y divide-white/5 light:divide-black/8">
          {membership.history.map((year) => (
            <li key={year.id} className="py-3 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="font-barlow font-semibold text-chalk light:text-chalk-light">
                  {memberDate(year.startsAt)} to {memberDate(year.endsAt)}
                </p>
                <p className={dashMuted}>
                  {copy.history.type[year.priceType] ?? year.priceType}
                  {year.amount > 0 && ` · ${kes(year.amount)}`}
                  {year.receipt && ` · ${copy.history.receipt} ${year.receipt}`}
                </p>
              </div>
              {year.status === 'cancelled' && (
                <span className="text-xs font-semibold text-red-400 light:text-red-700">{copy.history.cancelled}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function MemberMembership() {
  const { refreshAll, notify } = useMemberDashboard()
  const [membership, setMembership] = useState<MyMembership | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(
    () =>
      getMyMembership()
        .then((m) => {
          setMembership(m)
          setError('')
        })
        .catch((err: any) => setError(err?.response?.data?.error || copy.loadError))
        .finally(() => setLoading(false)),
    []
  )

  const [shopDiscount, setShopDiscount] = useState<ShopDiscount | null>(null)

  useEffect(() => {
    void load()
    getShopDiscount().then(setShopDiscount).catch(() => setShopDiscount(null))
  }, [load])

  const onPaid = useCallback(() => {
    void load()
    refreshAll()
  }, [load, refreshAll])

  const onSuccess = useCallback(() => {
    notify('success', copy.success.title, copy.success.body)
    onPaid()
  }, [notify, onPaid])

  const header = <MemberPageHeader title={copy.title} highlight={copy.highlight} subtitle={copy.subtitle} />

  if (loading) {
    return (
      <>
        {header}
        <div className="flex justify-center py-16">
          <Loader className="w-10 h-10 animate-spin text-cta" />
        </div>
      </>
    )
  }
  if (error || !membership) {
    return (
      <>
        {header}
        <div className="bg-red-500/10 border border-red-500/20 p-4 flex gap-3 text-red-300 light:text-red-700 text-sm">
          <AlertCircle size={18} /> {error || copy.loadError}
        </div>
      </>
    )
  }

  const state = renewalState(membership)
  const onPerks = membership.perks.filter((p) => p.status === 'on')

  if (membership.active) {
    return (
      <>
        {header}
        <div className="space-y-6">
          <div className={dashCard}>
            <MemberBadge founding={membership.isFounding} />
            <h2 className={`${dashHeading} mt-3`}>{copy.active.until(memberDate(membership.until!))}</h2>
          </div>
          {state === 'renew_soon' && (
            <PriceBox
              membership={membership}
              heading={copy.active.renewHeading}
              note={copy.active.renewBody(memberDate(membership.quote.startsAt))}
              onPaid={onSuccess}
              onRefresh={onPaid}
            />
          )}
          <div className={dashCard}>
            <h2 className={`${dashHeading} mb-4`}>{copy.active.yourPerks}</h2>
            <PerkList perks={[...onPerks, ...membership.perks.filter((p) => p.status === 'coming_soon')]} withActions />
          </div>
          {shopDiscount?.isMember && (
            <div className={dashCard}>
              <h2 className={`${dashHeading} mb-2`}>{copy.shopDiscount.statusHeading}</h2>
              <p className={dashMuted}>
                {shopDiscount.available
                  ? copy.shopDiscount.available(kes(shopDiscount.amount))
                  : shopDiscount.usedOrderId
                    ? copy.shopDiscount.used(shopDiscount.usedOrderId.slice(0, 8).toUpperCase())
                    : copy.shopDiscount.usedNote}
              </p>
            </div>
          )}
          <History membership={membership} />
        </div>
      </>
    )
  }

  return (
    <>
      {header}
      <div className="space-y-6">
        <div className={dashCard}>
          {state === 'grace' ? (
            <>
              <h2 className={dashHeading}>{copy.grace.heading}</h2>
              <p className={`${dashMuted} mt-2`}>
                {copy.grace.body(kes(membership.quote.amount), memberDate(membership.renewalUntil!))}
              </p>
            </>
          ) : state === 'lapsed' ? (
            <>
              <h2 className={dashHeading}>{copy.lapsed.heading}</h2>
              <p className={`${dashMuted} mt-2`}>{copy.lapsed.body}</p>
            </>
          ) : (
            <>
              <h2 className={dashHeading}>{copy.hero.heading}</h2>
              <p className={`${dashMuted} mt-2`}>{copy.hero.body}</p>
            </>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className={`${dashCard} lg:col-span-2`}>
            <h2 className={`${dashHeading} mb-4`}>{copy.perksHeading}</h2>
            <PerkList perks={membership.perks} />
          </div>
          <PriceBox membership={membership} heading={copy.price.heading} onPaid={onSuccess} onRefresh={onPaid} />
        </div>
        {membership.history.length > 0 && <History membership={membership} />}
      </div>
    </>
  )
}
