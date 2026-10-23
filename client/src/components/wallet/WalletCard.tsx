import { Plus, Ticket, Wallet } from 'lucide-react'
import { cardSurface } from '../../utils/themeClasses'
import { formatKes } from '../../utils/captainDisplay'

interface WalletCardProps {
  balance: number
  payableCount: number
  onTopUp: () => void
  onPayEvents: () => void
}

export default function WalletCard({ balance, payableCount, onTopUp, onPayEvents }: WalletCardProps) {
  return (
    <div className={`${cardSurface} p-6 flex flex-wrap items-center justify-between gap-4`}>
      <div>
        <p className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light mb-1 flex items-center gap-1.5">
          <Wallet size={14} /> Wallet balance
        </p>
        <p className="font-bebas text-4xl text-chalk light:text-chalk-light">{formatKes(balance)}</p>
        <p className="text-xs text-fog light:text-fog-light mt-1">For event tickets and installments. Non-refundable.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onTopUp}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent light:bg-accent-light text-black light:text-white font-barlow-condensed font-bold text-sm tracking-widest uppercase"
        >
          <Plus size={14} /> Top up
        </button>
        <button
          type="button"
          onClick={onPayEvents}
          disabled={payableCount === 0}
          title={payableCount === 0 ? 'No bookings are waiting for payment' : undefined}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-accent light:border-accent-light text-accent light:text-accent-light font-barlow-condensed font-bold text-sm tracking-widest uppercase disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Ticket size={14} /> Pay for events{payableCount > 0 ? ` (${payableCount})` : ''}
        </button>
      </div>
    </div>
  )
}
