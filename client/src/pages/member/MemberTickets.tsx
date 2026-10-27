import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Loader, Zap } from 'lucide-react'
import { getFlashStatus } from '../../api/flashSales'
import { formatTimeLeft, loadFlashAccess } from '../../utils/flashAccess'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import TicketRow from '../../components/member/TicketRow'
import EmptyState from '../../components/member/EmptyState'

export default function MemberTickets() {
  const navigate = useNavigate()
  const { tickets, plansByBatch, cancelTicket } = useMemberDashboard()
  const [flashExpiresAt, setFlashExpiresAt] = useState<string | null>(null)

  useEffect(() => {
    getFlashStatus(loadFlashAccess()?.token)
      .then((status) => setFlashExpiresAt(status.eligible ? status.expiresAt : null))
      .catch(() => setFlashExpiresAt(null))
  }, [])

  return (
    <>
      <MemberPageHeader title="MY" highlight="TICKETS" />

      {flashExpiresAt && (
        <Link
          to="/flash-sales"
          className="mb-6 flex items-center justify-between gap-4 bg-accent/10 light:bg-accent-light/10 border border-accent/30 light:border-accent-light/30 border-l-4 border-l-accent light:border-l-accent-light px-5 py-4 no-underline hover:bg-accent/15 light:hover:bg-accent-light/15 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-accent light:text-accent-light flex-shrink-0" />
            <div>
              <p className="font-barlow-condensed font-bold text-base tracking-wide text-chalk light:text-chalk-light">
                Ticket-holder flash deals unlocked
              </p>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-500 light:text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" aria-hidden="true" />
                LIVE Goes away after {formatTimeLeft(flashExpiresAt)}
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-accent light:text-accent-light flex-shrink-0" />
        </Link>
      )}

      {tickets === null ? (
        <div className="flex justify-center py-10">
          <Loader className="w-8 h-8 animate-spin text-accent light:text-accent-light" />
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <EmptyState message="No tickets yet." to="/events" cta="Browse events" />
          ) : (
            tickets.map((t) => (
              <TicketRow
                key={t.id}
                ticket={t}
                plan={t.purchase_batch_id ? plansByBatch.get(t.purchase_batch_id) : undefined}
                onCancel={cancelTicket}
                onViewPlan={() => navigate('/dashboard/wallet')}
              />
            ))
          )}
          <p className="text-xs text-fog light:text-fog-light">
            Paid tickets can be cancelled up to 7 days before the event, once per calendar month. There's no refund: the
            ticket value goes to your wallet for future events.
          </p>
        </div>
      )}
    </>
  )
}
