import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAvailableEquipment } from '../api/equipment'
import { ArrowRight, Loader } from 'lucide-react'

interface Equipment {
  packageType: string
  price: number
  description: string
}

export default function EquipmentHire() {
  const navigate = useNavigate()
  const [packages, setPackages] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true)
        const data = await getAvailableEquipment()
        setPackages(data)
      } catch (err: any) {
        console.error('Error fetching equipment:', err)
        setError(err.response?.data?.error || 'Failed to load equipment packages')
      } finally {
        setLoading(false)
      }
    }
    fetchPackages()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading equipment packages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Equipment Hire</h1>
        <p className="text-gray-600 mb-12">
          Rent gym equipment at affordable rates. Choose your rental period.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.packageType}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 flex flex-col"
            >
              <h3 className="text-2xl font-bold mb-2 capitalize">{pkg.packageType}</h3>
              <p className="text-gray-600 text-sm mb-6">{pkg.description}</p>

              <div className="mb-6 flex-grow">
                <div className="text-3xl font-bold text-primary">
                  KES {pkg.price.toLocaleString()}
                  <span className="text-sm text-gray-600 font-normal">/day</span>
                </div>
              </div>

              <button
                onClick={() =>
                  navigate('/equipment-checkout', {
                    state: { packageType: pkg.packageType, pricePerDay: pkg.price },
                  })
                }
                className="bg-primary text-white py-3 rounded-lg hover:bg-opacity-90 font-semibold flex items-center justify-center gap-2"
              >
                Book Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-3">How It Works</h2>
          <ol className="space-y-2 text-sm text-gray-700">
            <li>
              <strong>1. Choose Package:</strong> Select a rental period (daily, weekly, or
              monthly)
            </li>
            <li>
              <strong>2. Select Dates:</strong> Pick your hire and return dates
            </li>
            <li>
              <strong>3. Confirm Details:</strong> Review the total cost and equipment details
            </li>
            <li>
              <strong>4. Pay with M-Pesa:</strong> Complete payment securely
            </li>
            <li>
              <strong>5. Collect Equipment:</strong> Collect your equipment at our location
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
