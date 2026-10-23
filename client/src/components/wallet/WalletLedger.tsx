import { useState } from 'react'
import { Loader } from 'lucide-react'
import { getWalletTransactions, type WalletTransaction } from '../../api/wallet'
import { WALLET_TX_LABELS } from '../../api/payments'
import { cardSurface } from '../../utils/themeClasses'
import { formatDate, formatKes } from '../../utils/captainDisplay'

const PAGE_SIZE = 20

function signedAmount(tx: WalletTransaction) {
  if (tx.amount === 0 && tx.mpesa_amount) {
    return { text: `${formatKes(tx.mpesa_amount)} via M-Pesa`, className: 'text-fog light:text-fog-light' }
  }
  if (tx.amount > 0) return { text: `+${formatKes(tx.amount)}`, className: 'text-green-400' }
  return { text: `−${formatKes(Math.abs(tx.amount))}`, className: 'text-red-400' }
}

interface WalletLedgerProps {
  /** First page, usually from `getWallet()`. */
  initial: WalletTransaction[]
}

export default function WalletLedger({ initial }: WalletLedgerProps) {
  const [rows, setRows] = useState(initial)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const loadMore = async () => {
    setLoading(true)
    try {
      const next = page + 1
      const result = await getWalletTransactions(next, PAGE_SIZE)
      setRows(next === 1 ? result.transactions : (r) => [...r, ...result.transactions])
      setTotal(result.total)
      setPage(next)
    } finally {
      setLoading(false)
    }
  }

  const canLoadMore = total === null ? initial.length >= 10 : rows.length < total

  if (rows.length === 0) {
    return <p className="text-sm text-fog light:text-fog-light py-6 text-center">No wallet activity yet.</p>
  }

  return (
    <div className="space-y-2">
      {rows.map((tx) => {
        const amount = signedAmount(tx)
        return (
          <div key={tx.id} className={`${cardSurface} p-3 flex flex-wrap justify-between gap-3 items-center`}>
            <div className="min-w-0">
              <p className="font-barlow-condensed font-bold">{WALLET_TX_LABELS[tx.type] ?? tx.type}</p>
              <p className="text-xs text-fog light:text-fog-light truncate">
                {formatDate(tx.created_at)}
                {tx.note ? ` · ${tx.note}` : ''}
                {tx.mpesa_receipt ? ` · ${tx.mpesa_receipt}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className={`font-bebas text-lg ${amount.className}`}>{amount.text}</p>
              {tx.status === 'pending' ? (
                <p className="text-xs text-yellow-400">Pending</p>
              ) : (
                tx.balance_after != null &&
                tx.amount !== 0 && <p className="text-xs text-fog light:text-fog-light">Balance {formatKes(tx.balance_after)}</p>
              )}
            </div>
          </div>
        )
      })}
      {canLoadMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="w-full py-2 text-sm text-accent light:text-accent-light hover:underline disabled:opacity-50"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin inline" /> : 'Show more'}
        </button>
      )}
    </div>
  )
}
