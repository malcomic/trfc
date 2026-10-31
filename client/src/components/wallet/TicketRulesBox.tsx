import type { PaymentRules } from '../../types'

const DEFAULT_RULES: PaymentRules = {
  credit_days: 60,
  deposit_pct: 30,
  deadline_days: 3,
  early_notice_hours: 24,
  terms_version: '',
}

interface TicketRulesBoxProps {
  rules?: PaymentRules
  accepted: boolean
  onChange: (accepted: boolean) => void
  /** Show the paying-in-parts rules too. */
  showPlanRules?: boolean
}

/** The ticket rules, shown before payment; the buyer must tick to accept them. */
export default function TicketRulesBox({ rules = DEFAULT_RULES, accepted, onChange, showPlanRules }: TicketRulesBoxProps) {
  return (
    <div className="border border-white/10 light:border-black/10 p-3 space-y-2 text-xs text-fog light:text-fog-light">
      <p className="font-semibold text-chalk light:text-chalk-light text-sm">Ticket rules</p>
      <ul className="list-disc pl-4 space-y-1">
        <li>
          Can't come? Tell us at least {rules.early_notice_hours} hours before the event and it's recorded as "cancelled
          early". Later than that, or not showing up, is a "no-show". Either way the ticket price becomes ticket value.
        </li>
        <li>
          Ticket value lasts {rules.credit_days} days, counted from the day after the event, until 11:59 pm on the last day.
          It is for event tickets only, cannot be transferred or cashed out, and cannot be extended.
        </li>
        {showPlanRules && (
          <li>
            Paying in parts: {rules.deposit_pct}% now (rounded up to the next KSh 10), the rest by the dates you choose.
            Everything must be paid {rules.deadline_days} day{rules.deadline_days === 1 ? '' : 's'} before the event. Your
            QR ticket is issued once fully paid. If the deadline is missed, the seat is released and what you paid becomes
            ticket value.
          </li>
        )}
        <li>Attendance is taken from the scan list at the event. If TRFC cancels an event, it is never a no-show.</li>
      </ul>
      <label className="flex items-start gap-2 text-sm text-chalk light:text-chalk-light">
        <input type="checkbox" className="mt-1" checked={accepted} onChange={(e) => onChange(e.target.checked)} />
        <span>I have read and accept the ticket rules.</span>
      </label>
    </div>
  )
}
