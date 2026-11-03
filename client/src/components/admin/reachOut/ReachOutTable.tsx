import { ChevronLeft, ChevronRight, ClipboardEdit, Loader, MessageCircle, Phone } from 'lucide-react'
import type { ReachOutMember } from '../../../api/admin/reachOut'
import AdminMobileCard, { AdminMobileCardRow } from '../AdminMobileCard'
import AdminResponsiveData from '../AdminResponsiveData'
import { answerLabel, QUESTION_SHORT_TITLES } from '../../../content/signupQuestions'
import { StatusBadge, contactLinks, formatDate, zoneDisplay } from './memberDisplay'

const HEADERS = [
  'Member',
  'Zone',
  'Joined on',
  QUESTION_SHORT_TITLES.time_with_trfc,
  QUESTION_SHORT_TITLES.hardest_now,
  QUESTION_SHORT_TITLES.goal_3m,
  QUESTION_SHORT_TITLES.want_more,
  QUESTION_SHORT_TITLES.exercise_frequency,
  'Last active / events',
  'Status',
  'Last contact',
  '',
]

function HardestNow({ member }: { member: ReachOutMember }) {
  return (
    <>
      {answerLabel('hardest_now', member.hardest_now)}
      {member.hardest_now_other && (
        <div className="text-xs italic text-gray-500 dark:text-gray-400 mt-0.5">"{member.hardest_now_other}"</div>
      )}
    </>
  )
}

function LastContact({ member }: { member: ReachOutMember }) {
  if (!member.last_contacted_at) return <>-</>
  return (
    <div className="text-xs">
      <div className="text-gray-900 dark:text-gray-100">
        {member.last_contacted_by ?? 'Someone'}, {formatDate(member.last_contacted_at)}
      </div>
      {member.last_note && <div className="text-gray-500 dark:text-gray-400 line-clamp-2">{member.last_note}</div>}
    </div>
  )
}

function Actions({ member, onSelect, mobile = false }: { member: ReachOutMember; onSelect: (m: ReachOutMember) => void; mobile?: boolean }) {
  const links = contactLinks(member)
  const base = `inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold ${mobile ? 'px-3' : ''}`
  return (
    <div className="flex items-center gap-3">
      {links.whatsapp && (
        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className={`${base} text-green-700 dark:text-green-400`} aria-label={`WhatsApp ${member.name ?? 'member'}`}>
          <MessageCircle size={18} /> {mobile && 'WhatsApp'}
        </a>
      )}
      {links.call && (
        <a href={links.call} className={`${base} text-blue-600 dark:text-blue-400`} aria-label={`Call ${member.name ?? 'member'}`}>
          <Phone size={18} /> {mobile && 'Call'}
        </a>
      )}
      <button type="button" onClick={() => onSelect(member)} className={`${base} text-gray-700 dark:text-gray-200`} aria-label={`Log contact with ${member.name ?? 'member'}`}>
        <ClipboardEdit size={18} /> {mobile ? 'Log contact' : ''}
      </button>
    </div>
  )
}

export default function ReachOutTable({
  members,
  total,
  page,
  pageSize,
  loading,
  onPage,
  onSelect,
}: {
  members: ReachOutMember[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  onPage: (page: number) => void
  onSelect: (member: ReachOutMember) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  if (loading && members.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className={loading ? 'opacity-60 transition-opacity' : ''}>
      <AdminResponsiveData
        isEmpty={members.length === 0}
        empty={
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center text-gray-600 dark:text-gray-400">
            No members match these filters.
          </div>
        }
        desktop={
          <table className="w-full min-w-[1400px] text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                {HEADERS.map((h, i) => (
                  <th key={i} className="px-3 py-3 text-left font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100 align-top">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{m.name || '-'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{m.phone || '-'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 break-all">{m.email || ''}</div>
                  </td>
                  <td className="px-3 py-3">{zoneDisplay(m)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDate(m.created_at)}</td>
                  <td className="px-3 py-3">{answerLabel('time_with_trfc', m.time_with_trfc)}</td>
                  <td className="px-3 py-3 max-w-[200px]"><HardestNow member={m} /></td>
                  <td className="px-3 py-3">{answerLabel('goal_3m', m.goal_3m)}</td>
                  <td className="px-3 py-3">{answerLabel('want_more', m.want_more)}</td>
                  <td className="px-3 py-3">{answerLabel('exercise_frequency', m.exercise_frequency)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div>{formatDate(m.last_active_at)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{m.events_attended} event{m.events_attended === 1 ? '' : 's'}</div>
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={m.outreach_status} /></td>
                  <td className="px-3 py-3 max-w-[200px]"><LastContact member={m} /></td>
                  <td className="px-3 py-3"><Actions member={m} onSelect={onSelect} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        mobile={members.map((m) => (
          <AdminMobileCard key={m.id} footer={<Actions member={m} onSelect={onSelect} mobile />}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{m.name || '-'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{m.phone || '-'}</p>
              </div>
              <StatusBadge status={m.outreach_status} />
            </div>
            <AdminMobileCardRow label="Zone" value={zoneDisplay(m)} />
            <AdminMobileCardRow label="Joined on" value={formatDate(m.created_at)} />
            <AdminMobileCardRow label={QUESTION_SHORT_TITLES.time_with_trfc} value={answerLabel('time_with_trfc', m.time_with_trfc)} />
            <AdminMobileCardRow label={QUESTION_SHORT_TITLES.hardest_now} value={<HardestNow member={m} />} />
            <AdminMobileCardRow label={QUESTION_SHORT_TITLES.goal_3m} value={answerLabel('goal_3m', m.goal_3m)} />
            <AdminMobileCardRow label={QUESTION_SHORT_TITLES.want_more} value={answerLabel('want_more', m.want_more)} />
            <AdminMobileCardRow label={QUESTION_SHORT_TITLES.exercise_frequency} value={answerLabel('exercise_frequency', m.exercise_frequency)} />
            <AdminMobileCardRow label="Last active" value={`${formatDate(m.last_active_at)} · ${m.events_attended} events`} />
            <AdminMobileCardRow label="Last contact" value={<LastContact member={m} />} />
          </AdminMobileCard>
        ))}
      />

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-300">
          <span>
            {from}-{to} of {total.toLocaleString()}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPage(page - 1)}
              className="inline-flex items-center gap-1 px-3 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="tabular-nums">
              {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => onPage(page + 1)}
              className="inline-flex items-center gap-1 px-3 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
