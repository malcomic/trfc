import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getProductById } from '../api/products'
import { useCart } from '../store/cartStore'
import { AlertCircle, Loader, ShoppingCart, ArrowLeft } from 'lucide-react'
import { Product, ProductSelection } from '../types'
import ProductOptionsPicker from '../components/ProductOptionsPicker'
import {
  EMPTY_SELECTION,
  allSizesSoldOut,
  availableStock,
  isSelectionComplete,
  optionsFromProduct,
  productHasOptions,
} from '../utils/productOptions'
import { trackViewContent } from '../utils/tiktokPixel'
import { pageRoot, inputField } from '../utils/themeClasses'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [selection, setSelection] = useState<ProductSelection>(EMPTY_SELECTION)

  useEffect(() => {
    if (id) {
      getProductById(id)
        .then(setProduct)
        .catch(() => setError('Product not found'))
        .finally(() => setLoading(false))
    }
  }, [id])

  useEffect(() => {
    if (!product) return
    trackViewContent(
      {
        content_id: String(product.id),
        content_type: 'product',
        content_name: product.name,
      },
      Number(product.price)
    )
  }, [product])

  const options = useMemo(() => (product ? optionsFromProduct(product) : null), [product])
  const hasOptions = options ? productHasOptions(options) : false
  const stockForSelection = options && product ? availableStock(options, selection, product.stock) : 0
  const selectionComplete = options ? isSelectionComplete(options, selection) : true

  useEffect(() => {
    if (stockForSelection > 0 && quantity > stockForSelection) setQuantity(stockForSelection)
  }, [stockForSelection, quantity])

  const handleAdd = () => {
    if (!product || !selectionComplete) return
    addItem(product, quantity, hasOptions ? selection : undefined)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) {
    return (
      <div className={`${pageRoot} flex items-center justify-center`}>
        <Loader className="animate-spin text-accent light:text-accent-light w-10 h-10" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className={`${pageRoot} py-16 px-6`}>
        <div className="max-w-xl mx-auto bg-red-500/10 border border-red-500/20 p-6 flex gap-3">
          <AlertCircle className="text-red-400" />
          <div>
            <p className="text-red-300 light:text-red-700 mb-4">{error || 'Not found'}</p>
            <Link to="/shop" className="text-accent light:text-accent-light">Back to shop</Link>
          </div>
        </div>
      </div>
    )
  }

  const p = product as any
  const categoryLabel: string | undefined = p.category_name || p.category || undefined
  const backPath = p.category_slug ? `/shop/c/${p.category_slug}` : '/shop'

  return (
    <div className={pageRoot}>
      <div className="max-w-4xl mx-auto px-[6%] py-10 pb-20">
        <button onClick={() => navigate(backPath)} className="inline-flex items-center gap-2 text-accent light:text-accent-light text-sm mb-6 bg-transparent border-0 cursor-pointer hover:underline">
          <ArrowLeft size={14} /> {p.category_name ? `Back to ${p.category_name}` : 'Back to Shop'}
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <img
            src={p.image_url || 'https://images.unsplash.com/photo-1556906781-9a412961a28d?w=600&q=80'}
            alt={p.name}
            className="w-full aspect-square object-cover clip-angled brightness-90"
          />
          <div>
            {categoryLabel && (
              <p className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light mb-2">{categoryLabel}</p>
            )}
            <h1 className="font-bebas text-5xl mb-4">{p.name}</h1>
            <p className="font-bebas text-4xl text-accent light:text-accent-light mb-6">KES {Number(p.price).toLocaleString()}</p>
            {p.description && <p className="text-fog light:text-fog-light leading-relaxed mb-8">{p.description}</p>}
            {p.stock === 0 || (options && allSizesSoldOut(options)) ? (
              <p className="text-fog light:text-fog-light font-barlow-condensed font-bold uppercase text-sm">Sold out</p>
            ) : (
              <>
                {hasOptions && options && (
                  <div className="mb-6">
                    <ProductOptionsPicker source={options} selection={selection} onChange={setSelection} />
                  </div>
                )}
                <div className="flex items-center gap-4 mb-6">
                  <label className="text-sm text-fog light:text-fog-light">Qty</label>
                  <input
                    type="number"
                    min={1}
                    max={stockForSelection || 99}
                    value={quantity}
                    onChange={(e) => {
                      const next = Math.max(1, parseInt(e.target.value) || 1)
                      setQuantity(stockForSelection > 0 ? Math.min(next, stockForSelection) : next)
                    }}
                    className={`w-20 px-3 py-2 ${inputField}`}
                  />
                </div>
                <button
                  onClick={handleAdd}
                  disabled={!selectionComplete}
                  className={`w-full py-4 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${added ? 'bg-green-600/30 text-green-400 light:text-green-700' : 'bg-accent light:bg-accent-light text-black light:text-white hover:bg-accent/90 light:hover:bg-accent-light/90'}`}
                >
                  <ShoppingCart size={18} />
                  {added ? 'Added to Cart!' : selectionComplete ? 'Add to Cart' : 'Choose your options'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
