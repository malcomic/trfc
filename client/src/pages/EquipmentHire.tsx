import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAvailableEquipment } from '../api/equipment'
<<<<<<< HEAD
import { AlertCircle, ArrowRight, Dumbbell, Check } from 'lucide-react'
import { Button, Card } from '../components/ui'
=======
import { ArrowRight, Loader, AlertCircle } from 'lucide-react'
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793

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
<<<<<<< HEAD
      <div className="min-h-screen bg-night text-chalk font-barlow flex items-center justify-center px-[6%] py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-fire/20 border-t-fire rounded-full animate-spin mx-auto mb-4" />
          <p className="text-fog">Loading equipment packages...</p>
        </div>
=======
      <div className="min-h-screen bg-night text-chalk flex items-center justify-center">
        <Loader className="w-12 h-12 animate-spin text-accent light:text-accent-light" />
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-night text-chalk font-barlow">
<<<<<<< HEAD
      {/* ── Hero ── */}
      <section className="bg-gradient-to-r from-ink via-ash to-ink border-b border-white/5 px-[6%] py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-4 before:block before:w-5 before:h-0.5 before:bg-fire">
            Premium Rentals
          </div>
          <h1 className="font-bebas text-clamp-lg leading-tight text-chalk mb-4 letter-spacing-tighter">
            EQUIPMENT <span className="text-fire">HIRE</span>
          </h1>
          <p className="text-lg text-fog max-w-2xl">
            Rent professional gym equipment at affordable rates. Choose your rental period and start your fitness journey today.
          </p>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="max-w-5xl mx-auto px-[6%] py-16">
        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-3 bg-danger-red/10 border border-danger-red/30 p-5 mb-8 rounded-sm">
            <AlertCircle size={20} className="text-danger-red flex-shrink-0 mt-0.5" />
            <p className="text-sm text-chalk/70">{error}</p>
          </div>
        )}

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {packages.map((pkg) => (
            <Card key={pkg.packageType} variant="interactive">
              <Card.Body>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-2">
                      Rental Option
                    </p>
                    <h3 className="font-bebas text-2xl text-chalk letter-spacing-tighter capitalize">
                      {pkg.packageType}
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-fire/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Dumbbell size={20} className="text-fire" />
                  </div>
                </div>

                <p className="text-sm text-fog mb-6 leading-relaxed">
                  {pkg.description}
                </p>

                <div className="mb-8 pb-8 border-b border-white/10">
                  <div className="font-bebas text-4xl text-fire letter-spacing-tighter">
                    KES {pkg.price.toLocaleString()}
                  </div>
                  <p className="text-xs text-fog mt-1">Per day</p>
                </div>

                <Button
                  onClick={() =>
                    navigate('/equipment-checkout', {
                      state: { packageType: pkg.packageType, pricePerDay: pkg.price },
                    })
                  }
                  variant="primary"
                  size="lg"
                  fullWidth
                  className="flex items-center justify-center gap-2"
                >
                  Book Now <ArrowRight size={16} />
                </Button>
              </Card.Body>
            </Card>
          ))}
        </div>

        {/* How It Works */}
        <Card>
          <Card.Body>
            <h2 className="font-bebas text-3xl text-chalk mb-8 letter-spacing-tighter">
              HOW <span className="text-fire">IT WORKS</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {[
                {
                  step: 1,
                  title: 'Choose Package',
                  desc: 'Select your rental period (daily, weekly, or monthly)'
                },
                {
                  step: 2,
                  title: 'Select Dates',
                  desc: 'Pick your hire and return dates that work for you'
                },
                {
                  step: 3,
                  title: 'Confirm Details',
                  desc: 'Review total cost and equipment specifications'
                },
                {
                  step: 4,
                  title: 'Pay with M-Pesa',
                  desc: 'Complete payment securely via M-Pesa'
                },
                {
                  step: 5,
                  title: 'Collect Equipment',
                  desc: 'Pick up your equipment at our location'
                }
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 bg-fire text-night font-bebas text-lg rounded-full flex items-center justify-center mx-auto mb-3">
                    {item.step}
                  </div>
                  <h4 className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk mb-2">
                    {item.title}
                  </h4>
                  <p className="text-xs text-fog leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>

        {/* Info Box */}
        <Card className="mt-12 bg-gradient-to-r from-fire/10 via-ember/5 to-fire/10 border-fire/20">
          <Card.Body>
            <div className="flex items-start gap-4">
              <Check size={24} className="text-fire flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk mb-2">
                  Why Rent From TRFC?
                </h3>
                <ul className="space-y-2 text-sm text-fog">
                  <li>✓ Professional-grade equipment maintained to the highest standards</li>
                  <li>✓ Competitive pricing with flexible rental periods</li>
                  <li>✓ Quick booking process — rent in minutes</li>
                  <li>✓ Local pickup at our Nairobi location</li>
                  <li>✓ Dedicated support for all rentals</li>
                </ul>
              </div>
            </div>
          </Card.Body>
        </Card>
=======
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
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
      </div>
    </div>
  )
}
