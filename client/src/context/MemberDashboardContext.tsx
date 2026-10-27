import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getMyCalendar,
  getMyDashboard,
  type CalendarResponse,
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
import TopUpModal from '../components/wallet/TopUpModal'
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
}

type Notify = (type: ToastMessage['type'], title: string, message?: string) => void

interface MemberDashboardValue {
  data: MemberDashboardData | null
  loading: boolean
  error: string
  setProfile: (profile: MemberProfile) => void
  /** True only while the account has an active membership. */
  isMember: boolean

  tickets: MemberTicket[] | null
  wallet: WalletSummary | null
  plans: PaymentPlan[]
  payable: PayableBatch[]
  plansByBatch: Map<string, PaymentPlan>
  ledgerKey: number
  balance: number
  loadTickets: () => Promise<void>
  loadWallet: () => Promise<void>
  refreshAll: () => void

  calendarMonth: string
  setCalendarMonth: (month: string) => void
  /** Increments on every refreshAll so pages can refetch their own data. */
  refreshKey: number
  fetchCalendarMonth: (month: string) => Promise<CalendarResponse>

  openTopUp: (amount?: number) => void
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

  const [topUpAmount, setTopUpAmount] = useState<number | undefined>(undefined)
  const [topUpOpen, setTopUpOpen] = useState(false)
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
    if (w) setData((d) => (d ? { ...d, stats: { ...d.stats, wallet_balance: w.balance } } : d))
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
    if (state.notice) notify('error', 'Installment plan', state.notice)
    if (isProgramId(state.joined)) {
      notify('success', "You're in", `${PROGRAMS[state.joined].name} is now in your dashboard.`)
    }
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location, navigate, notify])

  const plansByBatch = useMemo(() => new Map(plans.map((p) => [p.purchase_batch_id, p])), [plans])
  const balance = wallet?.balance ?? data?.stats.wallet_balance ?? 0

  const openTopUp = useCallback((amount?: number) => {
    setTopUpAmount(amount)
    setPayEventsOpen(false)
    setTopUpOpen(true)
  }, [])

  const setProfile = useCallback(
    (profile: MemberProfile) => setData((d) => (d ? { ...d, profile } : d)),
    []
  )

  const value: MemberDashboardValue = {
    data,
    loading,
    error,
    setProfile,
    isMember: data?.membership?.active ?? false,
    tickets,
    wallet,
    plans,
    payable,
    plansByBatch,
    ledgerKey,
    balance,
    loadTickets,
    loadWallet,
    refreshAll,
    calendarMonth,
    setCalendarMonth,
    refreshKey,
    fetchCalendarMonth,
    openTopUp,
    openPayEvents: () => setPayEventsOpen(true),
    cancelTicket: setCancelTarget,
    notify,
  }

  return (
    <MemberDashboardContext.Provider value={value}>
      {children}

      <TopUpModal
        isOpen={topUpOpen}
        defaultAmount={topUpAmount}
        cap={wallet?.cap}
        headroom={wallet?.headroom}
        onClose={() => setTopUpOpen(false)}
        onSuccess={(amount) => {
          notify('success', 'Wallet topped up', `${formatKes(amount)} added to your wallet.`)
          loadWallet()
        }}
      />
      <PayEventsModal
        isOpen={payEventsOpen}
        onClose={() => setPayEventsOpen(false)}
        batches={payable}
        balance={balance}
        onNeedTopUp={openTopUp}
        onPaid={(result) => {
          setPayEventsOpen(false)
          notify(
            'success',
            'Tickets paid',
            `${formatKes(result.total)} paid from your wallet. Your tickets have been emailed to you.`
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
            'Ticket cancelled',
            result.credited > 0 ? `${formatKes(result.credited)} added to your wallet.` : undefined
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
