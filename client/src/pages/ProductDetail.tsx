import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getProductById } from '../api/products'
import { useCart } from '../store/cartStore'
import { AlertCircle, Loader, ShoppingCart, ArrowLeft } from 'lucide-react'
import { Product } from '../types'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (id) {
      getProductById(id)
        .then(setProduct)
        .catch(() => setError('Product not found'))
        .finally(() => setLoading(false))
    }
  }, [id])

  const handleAdd = () => {
    if (!product) return
    addItem(product, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center">
        <Loader className="animate-spin text-fire w-10 h-10" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-night text-chalk py-16 px-6">
        <div className="max-w-xl mx-auto bg-red-500/10 border border-red-500/20 p-6 flex gap-3">
          <AlertCircle className="text-red-400" />
          <div>
            <p className="text-red-300 mb-4">{error || 'Not found'}</p>
            <Link to="/shop" className="text-fire">Back to shop</Link>
          </div>
        </div>
      </div>
    )
  }

  const p = product as any

  return (
    <div className="min-h-screen bg-night text-chalk font-barlow">
      <div className="max-w-4xl mx-auto px-[6%] py-10 pb-20">
        <button onClick={() => navigate('/shop')} className="inline-flex items-center gap-2 text-fire text-sm mb-6 bg-transparent border-0 cursor-pointer hover:underline">
          <ArrowLeft size={14} /> Back to Shop
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <img
            src={p.image_url || 'https://images.unsplash.com/photo-1556906781-9a412961a28d?w=600&q=80'}
            alt={p.name}
            className="w-full aspect-square object-cover clip-angled brightness-90"
          />
          <div>
            {p.category && (
              <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-2">{p.category}</p>
            )}
            <h1 className="font-bebas text-5xl mb-4">{p.name}</h1>
            <p className="font-bebas text-4xl text-fire mb-6">KES {Number(p.price).toLocaleString()}</p>
            {p.description && <p className="text-fog leading-relaxed mb-8">{p.description}</p>}
            {p.stock === 0 ? (
              <p className="text-fog font-barlow-condensed font-bold uppercase text-sm">Sold out</p>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <label className="text-sm text-fog">Qty</label>
                  <input
                    type="number"
                    min={1}
                    max={p.stock || 99}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 bg-smoke border border-white/10 px-3 py-2 text-chalk"
                  />
                </div>
                <button
                  onClick={handleAdd}
                  className={`w-full py-4 clip-angled font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase flex items-center justify-center gap-2 ${added ? 'bg-green-600/30 text-green-400' : 'bg-fire text-white hover:bg-ember'}`}
                >
                  <ShoppingCart size={18} />
                  {added ? 'Added to Cart!' : 'Add to Cart'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
