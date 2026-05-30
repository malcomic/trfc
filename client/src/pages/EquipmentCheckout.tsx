import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { createEquipmentHireRequest, initiateEquipmentPayment } from '../api/equipment'
import { AlertCircle, Loader, Calendar } from 'lucide-react'

export default function EquipmentCheckout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      equipmentName: 'Gym Equipment',
      hireDate: '',
      returnDate: '',
      phone: '',
    },
  })

  const state = location.state || {}
  const packageType = state.packageType || 'daily'
  const pricePerDay = state.pricePerDay || 500

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hireDate = watch('hireDate')
  const returnDate = watch('returnDate')

  const calculateDays = () => {
    if (!hireDate || !returnDate) return 0
    const start = new Date(hireDate)
    const end = new Date(returnDate)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const days = calculateDays()
  const totalPrice = days > 0 ? days * pricePerDay : 0

  const onSubmit = async (data: any) => {
    try {
      setLoading(true)
      setError('')

      // Create hire request first
      const hireRequest = await createEquipmentHireRequest({
        equipmentName: data.equipmentName,
        packageType: packageType,
        hireDate: data.hireDate,
        returnDate: data.returnDate,
        phone: data.phone,
      })

      // Initiate payment
      const paymentResponse = await initiateEquipmentPayment({
        phone: data.phone,
        amount: Math.round(totalPrice),
        equipmentHireId: hireRequest.id,
      })

      if (paymentResponse.checkoutRequestId) {
        navigate(`/hire-confirmation/${hireRequest.id}`, {
          state: {
            checkoutRequestId: paymentResponse.checkoutRequestId,
            equipmentName: data.equipmentName,
            hireDate: data.hireDate,
            returnDate: data.returnDate,
            totalPrice,
            phone: data.phone,
          },
        })
      } else {
        setError('Failed to initiate payment. Please try again.')
      }
    } catch (err: any) {
      console.error('Booking failed:', err)
      setError(
        err.response?.data?.error || 'Equipment hire booking failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen py-12 px-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/equipment')}
            className="text-primary hover:underline text-sm mb-4"
          >
            ← Back to Equipment
          </button>
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Book Equipment</h1>
          <p className="text-gray-600 dark:text-gray-400 capitalize">
            {packageType} Rental Package - KES {pricePerDay}/day
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Booking Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="md:col-span-2">
            <div className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow p-6 space-y-4">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Booking Details</h2>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">Equipment Name</label>
                <input
                  {...register('equipmentName', {
                    required: 'Equipment name is required',
                  })}
                  type="text"
                  placeholder="e.g., Dumbbells, Treadmill"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded px-4 py-2 bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary"
                />
                {errors.equipmentName && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.equipmentName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">Hire Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      {...register('hireDate', {
                        required: 'Hire date is required',
                      })}
                      type="date"
                      min={today}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded px-4 py-2 pl-10 bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  {errors.hireDate && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.hireDate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">Return Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      {...register('returnDate', {
                        required: 'Return date is required',
                      })}
                      type="date"
                      min={hireDate || today}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded px-4 py-2 pl-10 bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  {errors.returnDate && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.returnDate.message}</p>
                  )}
                </div>
              </div>

              <h2 className="text-xl font-bold mt-6 mb-4 text-gray-900 dark:text-white">Payment Details</h2>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                  Phone Number (254XXXXXXXXX)
                </label>
                <input
                  {...register('phone', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^254\d{9}$/,
                      message: 'Phone must be in format 254XXXXXXXXX',
                    },
                  })}
                  type="text"
                  placeholder="254712345678"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded px-4 py-2 bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary"
                />
                {errors.phone && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.phone.message}</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || totalPrice === 0}
                className="w-full bg-primary text-white py-3 rounded-lg hover:bg-opacity-90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Payment'
                )}
              </button>
            </div>
          </form>

          {/* Order Summary Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow p-6 sticky top-4">
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Booking Summary</h3>

              <div className="space-y-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Package Type</span>
                  <span className="font-semibold capitalize text-gray-900 dark:text-white">{packageType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Daily Rate</span>
                  <span className="font-semibold text-gray-900 dark:text-white">KES {pricePerDay.toLocaleString()}</span>
                </div>
                {days > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">Number of Days</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{days}</span>
                  </div>
                )}
              </div>

              {totalPrice > 0 && (
                <>
                  <div className="flex justify-between text-lg font-bold mb-6">
                    <span className="text-gray-900 dark:text-white">Total Cost</span>
                    <span className="text-primary">KES {totalPrice.toLocaleString()}</span>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-xs text-blue-700 dark:text-blue-400 space-y-2">
                    <p>
                      <strong>Rental Period:</strong>
                    </p>
                    {hireDate && <p>{new Date(hireDate).toLocaleDateString()}</p>}
                    {returnDate && <p>to {new Date(returnDate).toLocaleDateString()}</p>}
                  </div>
                </>
              )}

              {totalPrice === 0 && (
                <p className="text-gray-600 dark:text-gray-400 text-sm text-center py-4">
                  Select hire and return dates to see total cost
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
