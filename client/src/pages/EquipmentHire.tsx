import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAvailableEquipment } from '../api/equipment'
import { ArrowRight, Loader, AlertCircle } from 'lucide-react'

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
        setError(err.response?.data?.error || 'Failed to load equipment packages')
      } finally {
        setLoading(false)
      }
    }
    fetchPackages()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-night text-chalk flex items-center justify-center">
        <Loader className="w-12 h-12 animate-spin text-accent light:text-accent-light" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-night text-chalk font-barlow">
      <section className="bg-ink border-b border-white/5 px-[6%] pt-14 pb-11">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-bebas text-5xl">EQUIPMENT <span className="text-accent light:text-accent-light">HIRE</span></h1>
          <p className="text-fog mt-2">Rent gym equipment at affordable rates</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-[6%] py-10 pb-20">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 mb-8 flex gap-3 text-red-300 text-sm">
            <AlertCircle size={18} className="flex-shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div key={pkg.packageType} className="bg-ash border border-white/5 p-6 flex flex-col hover:border-accent/30 light:hover:border-accent-light/30 transition">
              <h3 className="font-barlow-condensed font-bold text-2xl capitalize mb-2">{pkg.packageType}</h3>
              <p className="text-fog text-sm mb-6 flex-1">{pkg.description}</p>
              <p className="font-bebas text-3xl text-accent light:text-accent-light mb-6">
                KES {pkg.price.toLocaleString()}<span className="text-sm text-fog font-barlow">/day</span>
              </p>
              <button
                onClick={() => navigate('/equipment/checkout', { state: { packageType: pkg.packageType, pricePerDay: pkg.price } })}
                className="w-full bg-accent light:bg-accent-light text-black light:text-white py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase hover:bg-accent/90 light:hover:bg-accent-light/90 flex items-center justify-center gap-2"
              >
                Book Now <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
