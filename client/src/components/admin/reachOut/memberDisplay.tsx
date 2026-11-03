import type { ReachOutMember } from '../../../api/admin/reachOut'
import { answerLabel, outreachStatusLabel, type OutreachStatus } from '../../../content/signupQuestions'
import { toKenyanMsisdn } from '../../../utils/phone'

export function zoneDisplay(member: Pick<ReachOutMember, 'zone' | 'zone_name'>): string {
  return member.zone_name ? `Team ${member.zone_name}` : answerLabel('zone', member.zone)
}

export function formatDate(value: string | null, withTime = false): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-KE', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' })
}

/** WhatsApp prefers the member's WhatsApp number; calls use their phone. */
export function contactLinks(member: Pick<ReachOutMember, 'phone' | 'whatsapp'>) {
  const whatsapp = toKenyanMsisdn(member.whatsapp) ?? toKenyanMsisdn(member.phone)
  const phone = toKenyanMsisdn(member.phone) ?? whatsapp
  return {
    whatsapp: whatsapp ? `https://wa.me/${whatsapp}` : null,
    call: phone ? `tel:+${phone}` : null,
  }
}

const STATUS_STYLES: Record<OutreachStatus, string> = {
  not_contacted: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  contacted: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  replied: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  not_interested: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
}

export function StatusBadge({ status }: { status: OutreachStatus }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[status] ?? STATUS_STYLES.not_contacted}`}>
      {outreachStatusLabel(status)}
    </span>
  )
}
