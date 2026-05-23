import { Link } from 'react-router-dom'
import { useCart } from '../store/cartStore'
import { useEffect, useRef } from 'react'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag } from 'lucide-react'

const cartStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600&family=Barlow+Condensed:wght@500;700;900&display=swap');

  .trfc-cart {
    --fire: #FF4500;
    --ember: #FF7A1A;
    --night: #0A0A0A;
    --ink: #111111;
    --ash: #1C1C1C;
    --smoke: #2A2A2A;
    --chalk: #F5F2EE;
    --fog: #6B6B6B;
    --mist: #2E2E2E;
    --danger: #FF3B30;
    --success: #30D158;
    min-height: 100vh;
    background: var(--night);
    font-family: 'Barlow', sans-serif;
    color: var(--chalk);
  }

  /* ── Hero strip ── */
  .trfc-cart__hero {
    background: var(--ink);
    border-bottom: 1px solid rgba(255,255,255,0.04);
    padding: 56px 6% 44px;
    position: relative;
    overflow: hidden;
  }
  .trfc-cart__hero-watermark {
    position: absolute;
    right: -1%;
    bottom: -16px;
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(100px, 16vw, 240px);
    color: rgba(255,69,0,0.05);
    line-height: 1;
    pointer-events: none;
    user-select: none;
    letter-spacing: -2px;
  }
  .trfc-cart__hero-inner {
    max-width: 960px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .trfc-cart__eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--fire);
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }
  .trfc-cart__eyebrow::before {
    content: '';
    display: block;
    width: 20px;
    height: 2px;
    background: var(--fire);
  }
  .trfc-cart__title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(52px, 8vw, 96px);
    line-height: 0.9;
    color: var(--chalk);
  }
  .trfc-cart__title span { color: var(--fire); }
  .trfc-cart__item-count {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fog);
    padding-bottom: 6px;
  }
  .trfc-cart__item-count strong {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    color: var(--fire);
    letter-spacing: 1px;
    margin-right: 4px;
    vertical-align: middle;
  }

  /* ── Layout ── */
  .trfc-cart__body {
    max-width: 960px;
    margin: 0 auto;
    padding: 40px 6% 80px;
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 24px;
    align-items: start;
  }
  @media (max-width: 860px) {
    .trfc-cart__body { grid-template-columns: 1fr; }
  }

  /* ── Item list ── */
  .trfc-cart__items { display: flex; flex-direction: column; gap: 2px; }

  .trfc-cart__item {
    background: var(--ash);
    border: 1px solid rgba(255,255,255,0);
    display: grid;
    grid-template-columns: 80px 1fr auto auto auto;
    gap: 0 18px;
    align-items: center;
    padding: 16px 20px;
    transition: border-color 0.2s;
    position: relative;
    overflow: hidden;
  }
  .trfc-cart__item:hover { border-color: rgba(255,255,255,0.06); }
  .trfc-cart__item::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 2px;
    background: var(--fire);
    transform: scaleY(0);
    transform-origin: bottom;
    transition: transform 0.25s cubic-bezier(0.16,1,0.3,1);
  }
  .trfc-cart__item:hover::before { transform: scaleY(1); }

  /* Item image */
  .trfc-cart__item-img {
    width: 80px;
    height: 80px;
    object-fit: cover;
    display: block;
    filter: brightness(0.85);
    clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
    background: var(--smoke);
  }
  .trfc-cart__item-img-placeholder {
    width: 80px;
    height: 80px;
    background: var(--smoke);
    display: flex;
    align-items: center;
    justify-content: center;
    clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
    color: var(--fog);
  }

  /* Item info */
  .trfc-cart__item-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 17px;
    letter-spacing: 0.3px;
    color: var(--chalk);
    margin-bottom: 4px;
    line-height: 1.2;
  }
  .trfc-cart__item-unit-price {
    font-size: 13px;
    color: var(--fog);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 500;
    letter-spacing: 1px;
  }
  .trfc-cart__item-unit-price span { color: var(--fire); }

  /* Qty controls */
  .trfc-cart__qty {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid rgba(255,255,255,0.08);
    clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
    overflow: hidden;
  }
  .trfc-cart__qty-btn {
    background: var(--smoke);
    border: none;
    color: var(--fog);
    width: 32px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    flex-shrink: 0;
  }
  .trfc-cart__qty-btn:hover { background: var(--fire); color: white; }
  .trfc-cart__qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .trfc-cart__qty-btn:disabled:hover { background: var(--smoke); color: var(--fog); }
  .trfc-cart__qty-val {
    width: 40px;
    text-align: center;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 20px;
    color: var(--chalk);
    line-height: 1;
    background: var(--ash);
    border-left: 1px solid rgba(255,255,255,0.06);
    border-right: 1px solid rgba(255,255,255,0.06);
    padding: 7px 0 5px;
  }

  /* Line total */
  .trfc-cart__item-total {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 24px;
    color: var(--chalk);
    letter-spacing: 0.5px;
    text-align: right;
    white-space: nowrap;
  }

  /* Remove */
  .trfc-cart__remove {
    background: none;
    border: none;
    color: var(--fog);
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s, background 0.2s;
    clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px));
  }
  .trfc-cart__remove:hover { color: var(--danger); background: rgba(255,59,48,0.08); }

  /* Column headers */
  .trfc-cart__col-headers {
    display: grid;
    grid-template-columns: 80px 1fr auto auto auto;
    gap: 0 18px;
    padding: 0 20px 12px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--fog);
    border-bottom: 1px solid rgba(255,255,255,0.04);
    margin-bottom: 2px;
  }

  /* ── Order summary panel ── */
  .trfc-cart__summary {
    background: var(--ash);
    border: 1px solid rgba(255,255,255,0.05);
    position: sticky;
    top: 80px;
  }

  .trfc-cart__summary-head {
    padding: 20px 24px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .trfc-cart__summary-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--fire);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .trfc-cart__summary-title::before {
    content: '';
    display: block;
    width: 14px;
    height: 2px;
    background: var(--fire);
  }

  .trfc-cart__summary-body { padding: 20px 24px; }

  .trfc-cart__summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    font-size: 14px;
    color: var(--fog);
  }
  .trfc-cart__summary-row:last-of-type { border-bottom: none; }
  .trfc-cart__summary-row span:last-child { color: var(--chalk); font-weight: 600; }
  .trfc-cart__summary-row.free span:last-child { color: var(--success); }

  .trfc-cart__summary-total {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 18px 0 20px;
    border-top: 2px solid rgba(255,69,0,0.3);
    margin-top: 4px;
  }
  .trfc-cart__summary-total-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--fog);
  }
  .trfc-cart__summary-total-val {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 40px;
    color: var(--fire);
    line-height: 1;
    letter-spacing: 1px;
  }

  /* Promo */
  .trfc-cart__promo {
    border-top: 1px solid rgba(255,255,255,0.05);
    padding: 16px 24px;
  }
  .trfc-cart__promo-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--fog);
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .trfc-cart__promo-wrap {
    display: flex;
    gap: 0;
  }
  .trfc-cart__promo-input {
    flex: 1;
    background: var(--smoke);
    border: 1px solid rgba(255,255,255,0.07);
    border-right: none;
    color: var(--chalk);
    font-family: 'Barlow', sans-serif;
    font-size: 13px;
    padding: 10px 14px;
    outline: none;
    min-width: 0;
    transition: border-color 0.2s;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 6px 100%, 0 calc(100% - 6px));
  }
  .trfc-cart__promo-input::placeholder { color: var(--fog); }
  .trfc-cart__promo-input:focus { border-color: rgba(255,69,0,0.35); }
  .trfc-cart__promo-btn {
    background: var(--smoke);
    border: 1px solid rgba(255,255,255,0.07);
    color: var(--chalk);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 10px 16px;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    white-space: nowrap;
  }
  .trfc-cart__promo-btn:hover { background: var(--fire); color: white; border-color: var(--fire); }

  /* CTA */
  .trfc-cart__checkout {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: calc(100% - 48px);
    margin: 0 24px 20px;
    background: var(--fire);
    color: white;
    text-decoration: none;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 15px;
    letter-spacing: 3px;
    text-transform: uppercase;
    padding: 16px 24px;
    clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
    transition: background 0.2s, transform 0.15s;
  }
  .trfc-cart__checkout:hover { background: var(--ember); transform: scale(1.02); }

  .trfc-cart__continue {
    display: block;
    text-align: center;
    padding-bottom: 20px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fog);
    text-decoration: none;
    transition: color 0.2s;
  }
  .trfc-cart__continue:hover { color: var(--fire); }

  /* Trust badges */
  .trfc-cart__trust {
    padding: 16px 24px;
    border-top: 1px solid rgba(255,255,255,0.04);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .trfc-cart__trust-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--fog);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 500;
    letter-spacing: 0.5px;
  }
  .trfc-cart__trust-row::before {
    content: '✓';
    color: var(--success);
    font-weight: 700;
    font-size: 12px;
  }

  /* ── Empty state ── */
  .trfc-cart__empty {
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 80px 24px;
  }
  .trfc-cart__empty-icon {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(80px, 12vw, 140px);
    color: rgba(255,69,0,0.07);
    line-height: 1;
    margin-bottom: 20px;
    letter-spacing: -2px;
  }
  .trfc-cart__empty-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 22px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--fog);
    margin-bottom: 8px;
  }
  .trfc-cart__empty-sub {
    font-size: 14px;
    color: var(--mist);
    margin-bottom: 36px;
  }
  .trfc-cart__empty-cta {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: var(--fire);
    color: white;
    text-decoration: none;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 14px;
    letter-spacing: 3px;
    text-transform: uppercase;
    padding: 14px 36px;
    clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
    transition: background 0.2s, transform 0.15s;
  }
  .trfc-cart__empty-cta:hover { background: var(--ember); transform: scale(1.03); }

  @media (max-width: 640px) {
    .trfc-cart__item {
      grid-template-columns: 64px 1fr auto;
      grid-template-rows: auto auto;
      row-gap: 12px;
    }
    .trfc-cart__item-img, .trfc-cart__item-img-placeholder { width: 64px; height: 64px; }
    .trfc-cart__item-total { grid-column: 3; grid-row: 2; }
    .trfc-cart__qty { grid-column: 2; grid-row: 2; }
    .trfc-cart__remove { grid-column: 3; grid-row: 1; justify-self: end; }
    .trfc-cart__col-headers { display: none; }
  }
`

export default function Cart() {
  const { items, removeItem, updateQuantity, getTotal } = useCart()
  const total = getTotal()
  const styleRef = useRef<HTMLStyleElement | null>(null)

  useEffect(() => {
    if (document.getElementById('trfc-cart-styles')) return
    const el = document.createElement('style')
    el.id = 'trfc-cart-styles'
    el.textContent = cartStyles
    document.head.appendChild(el)
    styleRef.current = el
    return () => {
      const existing = document.getElementById('trfc-cart-styles')
      if (existing) document.head.removeChild(existing)
    }
  }, [])

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    updateQuantity(productId, newQuantity)
  }

  const subtotal = total
  const shipping = subtotal >= 3000 ? 0 : 250
  const grandTotal = subtotal + shipping

  return (
    <div className="trfc-cart">

      {/* ── Hero ── */}
      <section className="trfc-cart__hero">
        <div className="trfc-cart__hero-watermark" aria-hidden="true">CART</div>
        <div className="trfc-cart__hero-inner">
          <div>
            <div className="trfc-cart__eyebrow">Your Order</div>
            <h1 className="trfc-cart__title">
              MY<br /><span>CART</span>
            </h1>
          </div>
          {items.length > 0 && (
            <p className="trfc-cart__item-count">
              <strong>{items.length}</strong>
              item{items.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      </section>

      {/* ── Empty state ── */}
      {items.length === 0 && (
        <div className="trfc-cart__empty">
          <div className="trfc-cart__empty-icon">EMPTY<br />CART</div>
          <p className="trfc-cart__empty-title">Nothing in here yet</p>
          <p className="trfc-cart__empty-sub">
            Head to the shop and grab some TRFC gear.
          </p>
          <Link to="/shop" className="trfc-cart__empty-cta">
            <ShoppingBag size={16} />
            Browse the Shop
          </Link>
        </div>
      )}

      {/* ── Cart content ── */}
      {items.length > 0 && (
        <div className="trfc-cart__body">

          {/* Left — items */}
          <div>
            {/* Column headers */}
            <div className="trfc-cart__col-headers">
              <span>Item</span>
              <span />
              <span style={{ textAlign: 'center' }}>Qty</span>
              <span style={{ textAlign: 'right' }}>Total</span>
              <span />
            </div>

            <div className="trfc-cart__items">
              {items.map((item) => (
                <div key={item.product.id} className="trfc-cart__item">
                  {/* Image */}
                  {(item.product as any).image_url ? (
                    <img
                      src={(item.product as any).image_url}
                      alt={item.product.name}
                      className="trfc-cart__item-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="trfc-cart__item-img-placeholder">
                      <ShoppingBag size={20} />
                    </div>
                  )}

                  {/* Info */}
                  <div>
                    <p className="trfc-cart__item-name">{item.product.name}</p>
                    <p className="trfc-cart__item-unit-price">
                      KES <span>{Number(item.product.price).toLocaleString()}</span> each
                    </p>
                  </div>

                  {/* Qty */}
                  <div className="trfc-cart__qty">
                    <button
                      className="trfc-cart__qty-btn"
                      onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={12} />
                    </button>
                    <div className="trfc-cart__qty-val">{item.quantity}</div>
                    <button
                      className="trfc-cart__qty-btn"
                      onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Line total */}
                  <p className="trfc-cart__item-total">
                    KES {(item.product.price * item.quantity).toLocaleString()}
                  </p>

                  {/* Remove */}
                  <button
                    className="trfc-cart__remove"
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
          <div className="trfc-cart__summary">
            <div className="trfc-cart__summary-head">
              <p className="trfc-cart__summary-title">Order Summary</p>
            </div>

            <div className="trfc-cart__summary-body">
              <div className="trfc-cart__summary-row">
                <span>Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})</span>
                <span>KES {subtotal.toLocaleString()}</span>
              </div>
              <div className={`trfc-cart__summary-row${shipping === 0 ? ' free' : ''}`}>
                <span>Delivery</span>
                <span>{shipping === 0 ? 'FREE' : `KES ${shipping.toLocaleString()}`}</span>
              </div>
              {shipping > 0 && (
                <div style={{
                  background: 'rgba(255,69,0,0.06)', border: '1px solid rgba(255,69,0,0.12)',
                  padding: '10px 12px', marginTop: '4px',
                  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 500,
                  fontSize: '12px', letterSpacing: '0.5px', color: 'var(--fog)',
                }}>
                  Add KES {(3000 - subtotal).toLocaleString()} more for <span style={{ color: 'var(--fire)', fontWeight: 700 }}>free delivery</span>
                </div>
              )}

              <div className="trfc-cart__summary-total">
                <div>
                  <p className="trfc-cart__summary-total-label">Total</p>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', color: 'var(--fog)', letterSpacing: '1px' }}>
                    Taxes included
                  </p>
                </div>
                <p className="trfc-cart__summary-total-val">
                  KES {grandTotal.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Promo code */}
            <div className="trfc-cart__promo">
              <p className="trfc-cart__promo-label">
                <Tag size={11} /> Promo Code
              </p>
              <div className="trfc-cart__promo-wrap">
                <input
                  type="text"
                  className="trfc-cart__promo-input"
                  placeholder="Enter code…"
                />
                <button className="trfc-cart__promo-btn">Apply</button>
              </div>
            </div>

            {/* Checkout CTA */}
            <Link to="/checkout" className="trfc-cart__checkout">
              Proceed to Checkout <ArrowRight size={16} />
            </Link>

            <Link to="/shop" className="trfc-cart__continue">
              ← Continue Shopping
            </Link>

            {/* Trust badges */}
            <div className="trfc-cart__trust">
              <p className="trfc-cart__trust-row">Secure checkout</p>
              <p className="trfc-cart__trust-row">Free returns within 7 days</p>
              <p className="trfc-cart__trust-row">Official TRFC merchandise</p>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}