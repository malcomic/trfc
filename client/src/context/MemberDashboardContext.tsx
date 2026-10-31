import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getMyCalendar,
  getMyDashboard,
  type CalendarResponse,
  type MemberCaptainSummary,
  type MemberDashboard as MemberDashboardData,
  type MemberProfile,
} from '../api/users'
import { getUserTickets } from '../api/events'
import {
  getPayableBatches,
  getPlans,
  getWallet,
  type PayableBatch,
  type PaymentPlan,
  type WalletSummary,
} from '../api/wallet'
import { formatKes } from '../utils/captainDisplay'
import { PROGRAMS, isProgramId } from '../content/programs'
import { monthOfDay, monthRange, nairobiToday } from '../utils/calendarGrid'
import { ToastStack, type ToastMessage } from '../components/Toast'
import PayEventsModal from '../components/wallet/PayEventsModal'
import CancelTicketDialog from '../components/wallet/CancelTicketDialog'

export interface MemberTicket {
  id: string
  event_id: string
  event_title: string
  event_date: string | null
  location: string | null
  payment_status: string
  purchase_batch_id: string | null
  price: number | null
  ticket_type_name: string | null
  zone_name: string | null
  can_cancel?: boolean
  cancel_blocked_reason?: string | null
  cancel_credit_amount?: number
  cancel_notice_status?: 'cancelled_early' | 'no_show' | null
  attendance_status?: string | null
}

type Notify = (type: ToastMessage['type'], title: string, message?: string) => void

interface MemberDashboardValue {
  data: MemberDashboardData | null
  loading: boolean
  error: string
  setProfile: (profile: MemberProfile) => void
  setCaptain: (captain: MemberCaptainSummary | null) => void
  /** True only while the account has an active membership. */
  isMember: boolean

  tickets: MemberTicket[] | null
  wallet: WalletSummary | null
  plans: PaymentPlan[]
  payable: PayableBatch[]
  plansByBatch: Map<string, PaymentPlan>
  ledgerKey: number
  /** Ticket value the member can use right now. */
  ticketValue: number
  loadTickets: () => Promise<void>
  loadWallet: () => Promise<void>
  refreshAll: () => void

  calendarMonth: string
  setCalendarMonth: (month: string) => void
  /** Increments on every refreshAll so pages can refetch their own data. */
  refreshKey: number
  fetchCalendarMonth: (month: string) => Promise<CalendarResponse>

  openPayEvents: () => void
  cancelTicket: (ticket: MemberTicket) => void
  notify: Notify
}

const MemberDashboardContext = createContext<MemberDashboardValue | null>(null)

export function MemberDashboardProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()

  const [data, setData] = useState<MemberDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [tickets, setTickets] = useState<MemberTicket[] | null>(null)
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [plans, setPlans] = useState<PaymentPlan[]>([])
  const [payable, setPayable] = useState<PayableBatch[]>([])
  const [ledgerKey, setLedgerKey] = useState(0)

  const [calendarMonth, setCalendarMonth] = useState(() => monthOfDay(nairobiToday()))
  const [refreshKey, setRefreshKey] = useState(0)
  const calendarCache = useRef(new Map<string, CalendarResponse>())

  const [payEventsOpen, setPayEventsOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<MemberTicket | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const notify = useCallback<Notify>((type, title, message) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, type, title, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])

  const loadTickets = useCallback(
    () => getUserTickets().then(setTickets).catch(() => setTickets([])),
    []
  )

  const loadWallet = useCallback(async () => {
    const [w, p, b] = await Promise.all([
      getWallet().catch(() => null),
      getPlans().catch(() => [] as PaymentPlan[]),
      getPayableBatches().catch(() => [] as PayableBatch[]),
    ])
    if (w) setWallet(w)
    setPlans(p)
    setPayable(b)
    setLedgerKey((k) => k + 1)
    if (w) setData((d) => (d ? { ...d, stats: { ...d.stats, wallet_balance: w.ticketValue } } : d))
  }, [])

  const fetchCalendarMonth = useCallback(async (month: string) => {
    const cached = calendarCache.current.get(month)
    if (cached) return cached
    const { from, to } = monthRange(month)
    const result = await getMyCalendar(from, to)
    calendarCache.current.set(month, result)
    return result
  }, [])

  const refreshAll = useCallback(() => {
    getMyDashboard().then(setData).catch(() => undefined)
    loadTickets()
    loadWallet()
    calendarCache.current.clear()
    setRefreshKey((v) => v + 1)
  }, [loadTickets, loadWallet])

  useEffect(() => {
    getMyDashboard()
      .then(setData)
      .catch((err: any) => setError(err.response?.data?.error || 'Failed to load your dashboard'))
      .finally(() => setLoading(false))
    loadTickets()
    loadWallet()
  }, [loadTickets, loadWallet])

  useEffect(() => {
    const state = location.state as { notice?: string; joined?: string } | null
    if (!state?.notice && !state?.joined) return
    if (state.notice) notify('error', 'Paying in parts', state.notice)
    if (isProgramId(state.joined)) {
      notify('success', "You're in", `${PROGRAMS[state.joined].name} is now in your dashboard.`)
    }
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location, navigate, notify])

  const plansByBatch = useMemo(() => new Map(plans.map((p) => [p.purchase_batch_id, p])), [plans])
  const ticketValue = wallet?.ticketValue ?? data?.stats.wallet_balance ?? 0

  const setProfile = useCallback(
    (profile: MemberProfile) => setData((d) => (d ? { ...d, profile } : d)),
    []
  )
  const setCaptain = useCallback(
    (captain: MemberCaptainSummary | null) => setData((d) => (d ? { ...d, captain } : d)),
    []
  )

  const value: MemberDashboardValue = {
    data,
    loading,
    error,
    setProfile,
    setCaptain,
    isMember: data?.membership?.active ?? false,
    tickets,
    wallet,
    plans,
    payable,
    plansByBatch,
    ledgerKey,
    ticketValue,
    loadTickets,
    loadWallet,
    refreshAll,
    calendarMonth,
    setCalendarMonth,
    refreshKey,
    fetchCalendarMonth,
    openPayEvents: () => setPayEventsOpen(true),
    cancelTicket: setCancelTarget,
    notify,
  }

  return (
    <MemberDashboardContext.Provider value={value}>
      {children}

      <PayEventsModal
        isOpen={payEventsOpen}
        onClose={() => setPayEventsOpen(false)}
        batches={payable}
        ticketValue={ticketValue}
        onPaid={(result) => {
          setPayEventsOpen(false)
          notify(
            'success',
            result.status === 'paid' ? 'Tickets paid' : 'Payment sent',
            result.status === 'paid'
              ? `${formatKes(result.creditUsed)} of ticket value used. Your tickets have been emailed to you.`
              : 'Your tickets are emailed as soon as M-Pesa confirms the payment.'
          )
          refreshAll()
        }}
      />
      <CancelTicketDialog
        ticket={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={(result) => {
          setCancelTarget(null)
          notify(
            'success',
            result.noticeStatus === 'cancelled_early' ? 'Cancelled early' : 'Recorded as a no-show',
            result.credited > 0
              ? result.noticeStatus === 'cancelled_early'
                ? `${formatKes(result.credited)} is now ticket value you can use on another event.`
                : `${formatKes(result.credited)} of ticket value appears the morning after the event.`
              : undefined
          )
          refreshAll()
        }}
      />
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </MemberDashboardContext.Provider>
  )
}

export function useMemberDashboard() {
  const ctx = useContext(MemberDashboardContext)
  if (!ctx) throw new Error('useMemberDashboard must be used inside MemberDashboardProvider')
  return ctx
}
