import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { startMembershipCheckout, type MyMembership } from '../../../api/membership'
import {
  MEMBERSHIP_COPY,
  foundingLine,
  kes,
  memberDate,
  quoteLine,
} from '../../../content/membership'
import PaymentStatusModal from '../../PaymentStatusModal'
import CtaButton from '../../programs/CtaButton'
import { dashCard, dashHeading, dashMuted } from '../dashboard/ui'
import { inputField } from '../../../utils/themeClasses'
import { toKenyanMsisdn } from '../../../utils/phone'

const copy = MEMBERSHIP_COPY

/** M-Pesa membership checkout: phone field, STK push, and payment status modal. */
export default function MembershipPayBox({
  membership,
  heading,
  note,
  onPaid,
  onRefresh,
  className = '',
}: {
  membership: MyMembership
  heading: string
  note?: string
  onPaid: () => void
  onRefresh: () => void
  className?: string
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
    <div className={`${dashCard} border-cta/40 light:border-cta ${className}`.trim()}>
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
