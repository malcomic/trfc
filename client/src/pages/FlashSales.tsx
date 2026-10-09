import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, MapPin, ShoppingCart, Zap } from 'lucide-react'
import { getFlashSales, requestFlashAccess } from '../api/flashSales'
import FlashSaleOffers from '../components/FlashSaleOffers'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../store/cartStore'
import type { FlashSalesResponse } from '../types'
import { clearFlashAccess, loadFlashAccess, saveFlashAccess } from '../utils/flashAccess'
import { pageRoot } from '../utils/themeClasses'

const inputClass =
  'w-full bg-smoke light:bg-smoke-light border border-white/10 light:border-black/10 px-4 py-3 text-chalk light:text-chalk-light focus:outline-none focus:border-accent light:focus:border-accent-light'

function decodeTokenExpiry(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? new Date(payload.exp * 1000).toISOString() : null
  } catch {
    return null
  }
}

export default function FlashSales() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  const { items } = useCart()
  const [deals, setDeals] = useState<FlashSalesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsUnlock, setNeedsUnlock] = useState(false)
  const [error, setError] = useState('')
  const [reference, setReference] = useState('')
  const [contact, setContact] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  const loadDeals = useCallback(async (token: string) => {
    const data = await getFlashSales(token)
    setDeals(data)
    setNeedsUnlock(false)
  }, [])

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    const init = async () => {
      setLoading(true)
      const urlToken = searchParams.get('access')
      if (urlToken) {
        const expiresAt = decodeTokenExpiry(urlToken)
        if (expiresAt) saveFlashAccess({ token: urlToken, expiresAt })
        const next = new URLSearchParams(searchParams)
        next.delete('access')
        setSearchParams(next, { replace: true, preventScrollReset: true })
      }

      const stored = loadFlashAccess()
      if (stored) {
        try {
          await loadDeals(stored.token)
          if (!cancelled) setLoading(false)
          return
        } catch {
          clearFlashAccess()
        }
      }

      if (user) {
        try {
          const access = await requestFlashAccess({})
          saveFlashAccess(access)
          await loadDeals(access.token)
          if (!cancelled) setLoading(false)
          return
        } catch {
          /* fall through to unlock form */
        }
      }

      if (!cancelled) {
        setNeedsUnlock(true)
        setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    const ref = reference.trim()
    const value = contact.trim()
    if (!ref || !value) {
      setError('Enter your payment reference and the email or phone used at checkout')
      return
    }
    const isEmail = value.includes('@')
    try {
      setUnlocking(true)
      setError('')
      const access = await requestFlashAccess({
        checkoutRequestId: ref,
        ...(isEmail ? { email: value.toLowerCase() } : { phone: value.replace(/\s+/g, '') }),
      })
      saveFlashAccess(access)
      await loadDeals(access.token)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not unlock flash deals')
    } finally {
      setUnlocking(false)
    }
  }

  const flashInCart = items.filter((item) => item.flashSaleId).length

  const zoneBadge = deals && (
    <div className="mb-6 inline-flex items-center gap-2 border border-accent/30 light:border-accent-light/30 bg-accent/10 light:bg-accent-light/10 px-3 py-1.5 font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light">
      <MapPin size={13} />
      {deals.zone ? `Deals for ${deals.zone.name} zone` : 'Deals open to everyone'}
    </div>
  )

  return (
    <div className={`${pageRoot} py-12 px-6`}>
      <div className="max-w-6xl mx-auto">
        <nav className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light mb-6">
          <Link to="/shop" className="no-underline text-fog light:text-fog-light hover:text-accent light:hover:text-accent-light">
            Shop
          </Link>
          <span className="mx-2">/</span>
          <span className="text-chalk light:text-chalk-light">Flash deals</span>
        </nav>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent light:border-accent-light" />
          </div>
        ) : needsUnlock ? (
          <div className="max-w-md mx-auto bg-ash light:bg-ash-light border border-white/5 light:border-black/8 p-8">
            <div className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 mb-2">
              <Zap size={14} /> Ticket-holder exclusive
            </div>
            <h1 className="font-bebas text-4xl mb-2">
              UNLOCK <span className="text-accent light:text-accent-light">FLASH DEALS</span>
            </h1>
            <p className="text-fog light:text-fog-light text-sm mb-6">
              Flash deals are available for 24 hours after you buy an event ticket. Enter the payment reference from your
              ticket confirmation and the email or M-Pesa phone used at checkout.
            </p>
            {error && (
              <div className="flex items-start gap-2 text-red-400 text-sm mb-4">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleUnlock} className="space-y-4">
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Payment reference" className={inputClass} />
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or 254712345678" className={inputClass} />
              <button
                type="submit"
                disabled={unlocking}
                className="w-full bg-accent light:bg-accent-light text-black light:text-white py-3 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90 disabled:opacity-60"
              >
                {unlocking ? 'Checking…' : 'Unlock deals'}
              </button>
            </form>
            <p className="text-sm text-fog light:text-fog-light mt-6">
              {user ? 'No ticket in the last 24 hours?' : (
                <>
                  Bought a ticket while logged in?{' '}
                  <Link to="/login" className="text-accent light:text-accent-light">
                    Log in
                  </Link>
                  .{' '}
                </>
              )}{' '}
              <Link to="/events" className="text-accent light:text-accent-light">
                Browse events
              </Link>
            </p>
          </div>
        ) : deals && deals.offers.length > 0 ? (
          <>
            {zoneBadge}
            <FlashSaleOffers offers={deals.offers} accessExpiresAt={deals.accessExpiresAt} />
            {flashInCart > 0 && (
              <div className="mt-8 flex justify-end">
                <Link
                  to="/cart"
                  className="inline-flex items-center gap-2 bg-accent light:bg-accent-light text-black light:text-white px-6 py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase no-underline"
                >
                  <ShoppingCart size={16} /> Go to cart
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24">
            {zoneBadge}
            <Zap size={32} className="mx-auto text-fog light:text-fog-light mb-4" />
            <h1 className="font-bebas text-4xl mb-2">NO FLASH DEALS RIGHT NOW</h1>
            <p className="text-fog light:text-fog-light text-sm mb-6">
              {deals?.zone
                ? `No flash deals for the ${deals.zone.name} zone right now. Check back soon.`
                : 'Check back soon — new deals drop for ticket holders.'}
            </p>
            <Link to="/shop" className="text-accent light:text-accent-light font-barlow-condensed font-bold text-sm tracking-widest uppercase">
              Browse the shop
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
