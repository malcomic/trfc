import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getEquipmentHireById } from '../api/equipment'
import { pollPaymentStatus } from '../api/payments'
import { AlertCircle, CheckCircle, Clock, Package } from 'lucide-react'

export default function HireConfirmation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state || {}) as {
    hireId?: string
    equipmentName?: string
    hireDate?: string
    returnDate?: string
    totalPrice?: number
    phone?: string
    checkoutRequestId?: string
  }
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending')
  const [loading, setLoading] = useState(true)
  const [hire, setHire] = useState<any>(null)

  const checkoutRequestId = state.checkoutRequestId

  useEffect(() => {
    const load = async () => {
      try {
        if (id && state.phone) {
          const data = await getEquipmentHireById(id, state.phone)
          setHire(data)
          if (data.payment_status === 'paid') setPaymentStatus('paid')
        }
        if (checkoutRequestId && paymentStatus !== 'paid') {
          try {
            await pollPaymentStatus(checkoutRequestId)
            setPaymentStatus('paid')
            if (id && state.phone) {
              const updated = await getEquipmentHireById(id, state.phone)
              setHire(updated)
            }
          } catch {
            /* polling timeout */
          }
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, checkoutRequestId, state.phone])

  const display = hire || state

  return (
    <div className="min-h-screen bg-night text-chalk font-barlow py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className={`p-6 mb-6 border-l-4 ${paymentStatus === 'paid' ? 'bg-green-500/10 border-green-500' : 'bg-fire/10 border-fire'}`}>
          <div className="flex items-center gap-3 mb-2">
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-fire" />
            ) : paymentStatus === 'paid' ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <Clock className="w-6 h-6 text-fire" />
            )}
            <h1 className="font-bebas text-3xl">
              {loading ? 'Confirming…' : paymentStatus === 'paid' ? 'Hire Confirmed!' : 'Payment Pending'}
            </h1>
          </div>
          <p className="text-fog text-sm">
            {paymentStatus === 'paid'
              ? 'Your equipment hire is confirmed. Collect at our location on the hire date.'
              : 'Complete M-Pesa payment on your phone to confirm the hire.'}
          </p>
        </div>

        <div className="bg-ash border border-white/5 p-6 mb-6 space-y-3">
          <div className="flex items-center gap-2 text-fire mb-4">
            <Package size={18} />
            <h2 className="font-barlow-condensed font-bold letter-spacing-widest text-transform-uppercase">Hire Details</h2>
          </div>
          {(display.equipment_name || display.equipmentName) && (
            <p><span className="text-fog">Equipment: </span>{display.equipment_name || display.equipmentName}</p>
          )}
          {(display.hire_date || display.hireDate) && (
            <p><span className="text-fog">Hire date: </span>{new Date(display.hire_date || display.hireDate).toLocaleDateString()}</p>
          )}
          {(display.return_date || display.returnDate) && (
            <p><span className="text-fog">Return date: </span>{new Date(display.return_date || display.returnDate).toLocaleDateString()}</p>
          )}
          {(display.total_cost != null || display.totalPrice != null) && (
            <p><span className="text-fog">Total: </span>KES {Number(display.total_cost ?? display.totalPrice).toLocaleString()}</p>
          )}
          {state.phone && <p><span className="text-fog">Phone: </span>{state.phone}</p>}
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/equipment')} className="flex-1 bg-fire text-white py-3 clip-angled font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase hover:bg-ember">
            Back to Equipment
          </button>
          {paymentStatus === 'pending' && !loading && (
            <button onClick={() => window.location.reload()} className="flex-1 bg-smoke border border-white/10 py-3 font-barlow-condensed font-bold text-sm hover:border-fire">
              Refresh
            </button>
          )}
        </div>

        {paymentStatus === 'pending' && !loading && (
          <div className="mt-6 flex gap-3 bg-red-500/10 border border-red-500/20 p-4 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300">Payment not confirmed yet. Check your phone for the M-Pesa prompt.</p>
          </div>
        )}
      </div>
    </div>
  )
}
