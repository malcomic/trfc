import { Link } from 'react-router-dom'
import { useCart } from '../store/cartStore'
import { useEffect } from 'react'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag } from 'lucide-react'
import { getShipping, getGrandTotal } from '../utils/shipping'
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses'

export default function Cart() {
  const { items, removeItem, updateQuantity, getTotal } = useCart()
  const total = getTotal()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    updateQuantity(productId, newQuantity)
  }

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = total
  const shipping = getShipping(subtotal)
  const grandTotal = getGrandTotal(subtotal)

  return (
    <div className={pageRoot}>

      {/* ── Hero ── */}
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11 relative overflow-hidden">
        <div className="absolute right-[-1%] bottom-[-16px] font-bebas text-clamp-2xl text-accent/5 light:text-accent-light/5 leading-none pointer-events-none select-none tracking-tighter">CART</div>
        <div className="max-w-5xl mx-auto relative z-1 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 mb-3 before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light">Your Order</div>
            <h1 className="font-bebas text-5xl text-chalk light:text-chalk-light leading-tight">
              MY<br /><span className="text-accent light:text-accent-light">CART</span>
            </h1>
          </div>
          {items.length > 0 && (
            <p className="font-barlow-condensed font-bold text-sm tracking-widest uppercase text-fog light:text-fog-light pb-1.5">
              <strong className="font-bebas text-2xl text-accent light:text-accent-light tracking-wider mr-1">{totalQuantity}</strong>
              item{totalQuantity !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      </section>

      {/* ── Empty state ── */}
      {items.length === 0 && (
        <div className="min-h-60vh flex flex-col items-center justify-center text-center px-6 py-20">
          <div className="font-bebas text-clamp-2xl text-accent/10 light:text-accent-light/10 leading-none mb-5 tracking-tighter">EMPTY<br />CART</div>
          <p className="font-barlow-condensed font-bold text-xl tracking-widest uppercase text-fog light:text-fog-light mb-2">Nothing in here yet</p>
          <p className="text-sm text-mist light:text-mist-light mb-9">
            Head to the shop and grab some TRFC gear.
          </p>
          <Link to="/shop" className="inline-flex items-center gap-4 bg-accent light:bg-accent-light text-black light:text-white no-underline font-barlow-condensed font-black text-sm tracking-widest uppercase px-9 py-3.5 clip-angled transition-all duration-200 hover:bg-accent/90 light:hover:bg-accent-light/90 hover:scale-103">
            <ShoppingBag size={16} />
            Browse the Shop
          </Link>
        </div>
      )}

      {/* ── Cart content ── */}
      {items.length > 0 && (
        <div className="max-w-4xl mx-auto px-[6%] py-10 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Left — items */}
          <div className="lg:col-span-2">
            {/* Column headers */}
            <div className="hidden md:grid grid-cols-5 gap-4.5 px-5 pb-3 font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light border-b border-white/5 light:border-black/8 mb-0.5">
              <span>Item</span>
              <span />
              <span className="text-center">Qty</span>
              <span className="text-right">Total</span>
              <span />
            </div>

            <div className="flex flex-col gap-0.5">
              {items.map((item) => (
                <div key={item.product.id} className={`${cardSurface} grid md:grid-cols-5 grid-cols-3 gap-4.5 items-center p-5 transition-all duration-200 hover:border-white/10 light:hover:border-black/15 relative group before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-accent light:before:bg-accent-light before:scale-y-0 before:origin-bottom before:transition-transform before:duration-250 hover:before:scale-y-100`}>
                  {/* Image */}
                  {(item.product as any).image_url ? (
                    <img
                      src={(item.product as any).image_url}
                      alt={item.product.name}
                      className="w-20 h-20 object-cover brightness-85 clip-angled-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 bg-smoke light:bg-smoke-light flex items-center justify-center text-fog light:text-fog-light clip-angled-sm">
                      <ShoppingBag size={20} />
                    </div>
                  )}

                  {/* Info */}
                  <div className="md:col-span-1 col-span-1">
                    <p className="font-barlow-condensed font-bold text-lg tracking-tighter text-chalk light:text-chalk-light leading-tight mb-1">{item.product.name}</p>
                    <p className="text-xs text-fog light:text-fog-light font-barlow-condensed font-medium tracking-widest">
                      KES <span className="text-accent light:text-accent-light">{Number(item.product.price).toLocaleString()}</span> each
                    </p>
                  </div>

                  {/* Qty */}
                  <div className="flex items-center gap-0 border border-white/10 light:border-black/10 overflow-hidden clip-angled-sm md:col-span-1">
                    <button
                      className="bg-smoke light:bg-smoke-light text-fog light:text-fog-light hover:bg-accent light:hover:bg-accent-light hover:text-white w-8 h-9 flex items-center justify-center cursor-pointer transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-smoke disabled:hover:text-fog"
                      onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={12} />
                    </button>
                    <div className="w-10 text-center font-bebas text-xl text-chalk light:text-chalk-light leading-none bg-ash light:bg-ash-light border-l border-r border-white/10 light:border-black/10 py-1.75">{item.quantity}</div>
                    <button
                      className="bg-smoke light:bg-smoke-light text-fog light:text-fog-light hover:bg-accent light:hover:bg-accent-light hover:text-white w-8 h-9 flex items-center justify-center cursor-pointer transition-all duration-200"
                      onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Line total */}
                  <p className="font-bebas text-2xl text-chalk light:text-chalk-light tracking-tighter text-right whitespace-nowrap">
                    KES {(item.product.price * item.quantity).toLocaleString()}
                  </p>

                  {/* Remove */}
                  <button
                    className="w-8 h-8 flex items-center justify-center text-fog hover:text-red-500 transition-colors duration-200 clip-angled-sm justify-self-end"
                    onClick={() => removeItem(item.product.id)}
                    aria-label={`Remove ${item.product.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right — summary */}
          <div className={`${cardSurface} sticky top-20`}>
            <div className="px-6 py-5 border-b border-white/5 light:border-black/8">
              <p className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 before:w-3.5 before:h-0.5 before:bg-accent light:before:bg-accent-light">Order Summary</p>
            </div>

            <div className="px-6 py-5">
              <div className="flex justify-between items-center py-2.5 border-b border-white/5 light:border-black/8 text-sm text-fog light:text-fog-light">
                <span>Subtotal ({totalQuantity} item{totalQuantity !== 1 ? 's' : ''})</span>
                <span className="text-chalk light:text-chalk-light font-semibold">KES {subtotal.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between items-center py-2.5 border-b border-white/5 light:border-black/8 text-sm ${shipping === 0 ? 'text-green-400' : 'text-fog light:text-fog-light'}`}>
                <span>Delivery</span>
                <span className={shipping === 0 ? 'text-green-400 font-semibold' : 'text-chalk light:text-chalk-light font-semibold'}>{shipping === 0 ? 'FREE' : `KES ${shipping.toLocaleString()}`}</span>
              </div>
              {shipping > 0 && (
                <div className="bg-accent/10 light:bg-accent-light/10 border border-accent/15 light:border-accent-light/15 px-3 py-2.5 mt-1 font-barlow-condensed font-medium text-xs tracking-tighter text-fog light:text-fog-light">
                  Add KES {(3000 - subtotal).toLocaleString()} more for <span className="text-accent light:text-accent-light font-bold">free delivery</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-4.5 border-t-2 border-accent/30 light:border-accent-light/30 mt-1">
                <div>
                  <p className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light">Total</p>
                  <p className="font-barlow-condensed text-xs tracking-tighter text-fog light:text-fog-light">
                    Taxes included
                  </p>
                </div>
                <p className="font-bebas text-4xl text-accent light:text-accent-light leading-none tracking-wider">
                  KES {grandTotal.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Promo code */}
            <div className="border-t border-white/5 light:border-black/8 px-6 py-4">
              <p className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light mb-2.5 flex items-center gap-1.5">
                <Tag size={11} /> Promo Code
              </p>
              <div className="flex gap-0">
                <input
                  type="text"
                  className={`flex-1 ${inputField} border-r-0 text-xs px-3.5 py-2.5 transition-all duration-200 focus:border-accent/40 light:focus:border-accent-light/40 clip-angled-l`}
                  placeholder="Enter code…"
                />
                <button className="bg-smoke light:bg-smoke-light hover:bg-accent light:hover:bg-accent-light text-chalk light:text-chalk-light hover:text-white border border-white/10 light:border-black/10 hover:border-accent light:hover:border-accent-light font-barlow-condensed font-bold text-xs tracking-widest uppercase px-4 py-2.5 cursor-pointer transition-all duration-200 flex-shrink-0 clip-angled-r">Apply</button>
              </div>
            </div>

            {/* Checkout CTA */}
            <Link to="/checkout" className="flex items-center justify-center gap-2.5 w-full mx-0 my-5 bg-accent light:bg-accent-light text-black light:text-white no-underline font-barlow-condensed font-black text-base tracking-widest uppercase px-6 py-4 clip-angled transition-all duration-200 hover:bg-accent/90 light:hover:bg-accent-light/90 hover:scale-102 mx-6 w-calc-100%-48px">
              Proceed to Checkout <ArrowRight size={16} />
            </Link>

            <Link to="/shop" className="block text-center text-xs tracking-widest uppercase text-fog light:text-fog-light no-underline font-barlow-condensed font-bold transition-all duration-200 hover:text-accent light:hover:text-accent-light pb-5">
              ← Continue Shopping
            </Link>

            {/* Trust badges */}
            <div className="px-6 py-4 border-t border-white/5 light:border-black/8 flex flex-col gap-2">
              <p className="flex items-center gap-2 text-xs text-fog light:text-fog-light font-barlow-condensed font-medium tracking-tighter before:content-['✓'] before:text-green-400 before:font-bold before:text-xs">Secure checkout</p>
              <p className="flex items-center gap-2 text-xs text-fog light:text-fog-light font-barlow-condensed font-medium tracking-tighter before:content-['✓'] before:text-green-400 before:font-bold before:text-xs">Free returns within 7 days</p>
              <p className="flex items-center gap-2 text-xs text-fog light:text-fog-light font-barlow-condensed font-medium tracking-tighter before:content-['✓'] before:text-green-400 before:font-bold before:text-xs">Official TRFC merchandise</p>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
