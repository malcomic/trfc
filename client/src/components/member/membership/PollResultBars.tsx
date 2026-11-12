import { CheckCircle2 } from 'lucide-react'
import type { MemberPoll } from '../../../api/membership'
import { MEMBERSHIP_COPY, pollPercents } from '../../../content/membership'

/** Live results for a poll. With `onVote`, each option is also a button; tapping another option changes the vote. */
export default function PollResultBars({
  poll,
  onVote,
  disabled = false,
}: {
  poll: MemberPoll
  onVote?: (optionId: string) => void
  disabled?: boolean
}) {
  const percents = pollPercents(poll.options.map((o) => o.votes))
  const copy = MEMBERSHIP_COPY.vote

  return (
    <ul className="space-y-2 list-none p-0 m-0">
      {poll.options.map((option, i) => {
        const mine = poll.myVote === option.id
        const content = (
          <>
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 rounded-lg ${mine ? 'bg-primary/25 dark:bg-primary-dark/30' : 'bg-gray-200 dark:bg-gray-700'}`}
              style={{ width: `${percents[i]}%` }}
            />
            <span className="relative flex items-center gap-2 w-full">
              {mine && <CheckCircle2 size={16} className="text-primary dark:text-primary-dark flex-shrink-0" aria-label={copy.yourVote} />}
              <span className="flex-1 text-left font-medium">{option.label}</span>
              {mine && <span className="text-xs font-semibold text-primary dark:text-primary-dark">{copy.yourVote}</span>}
              <span className="text-sm font-semibold tabular-nums w-12 text-right">{percents[i]}%</span>
            </span>
          </>
        )
        const base = `relative overflow-hidden flex items-center w-full min-h-[44px] px-3 py-2 rounded-lg border text-sm ${
          mine ? 'border-primary dark:border-primary-dark' : 'border-gray-200 dark:border-gray-700'
        }`
        return (
          <li key={option.id}>
            {onVote ? (
              <button
                type="button"
                onClick={() => onVote(option.id)}
                disabled={disabled}
                aria-pressed={mine}
                className={`${base} hover:border-primary dark:hover:border-primary-dark disabled:opacity-60 transition`}
              >
                {content}
              </button>
            ) : (
              <div className={base}>{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
