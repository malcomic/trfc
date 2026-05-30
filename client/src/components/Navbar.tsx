import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ShoppingCart, X, Menu, LogOut, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../store/cartStore'
import { ThemeToggle } from './ThemeToggle'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { token, logout } = useAuth()
  const { items } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const cartCount = items.reduce((s, i) => s + i.quantity, 0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close drawer on route change
  useEffect(() => { setIsOpen(false) }, [location.pathname])

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleLogout = () => {
    logout()
    setIsOpen(false)
    navigate('/')
  }

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/events', label: 'Events' },
    { to: '/programs', label: 'Programs' },
    { to: '/equipment', label: 'Equipment' },
    { to: '/gallery', label: 'Gallery' },
    { to: '/shop', label: 'Shop' },
    { to: '/testimonials', label: 'Testimonials' },
    { to: '/contact', label: 'Contact' },
  ]

  return (
    <>
      <style>{`
        .nav-link-underline::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 16px;
          right: 16px;
          height: 2px;
          background: #FF4500;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .nav-link-underline:hover::after,
        .nav-link-underline.active::after {
          transform: scaleX(1);
        }
        .nav-topline {
          height: 2px;
          background: linear-gradient(90deg, transparent, #FF4500 40%, #FF7A1A 60%, transparent);
        }
        @keyframes badgePop {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        .badge-pop {
          animation: badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
      `}</style>

      <nav className="sticky top-0 z-100">
        <div className="nav-topline" />

        <div className={`bg-gradient-to-r from-night to-night/95 dark:from-night dark:to-night/95 light:from-white light:to-white/95 backdrop-blur-[16px] transition-all duration-300 border-b ${scrolled ? 'border-fire/15 dark:border-fire/15 light:border-black/8' : 'border-white/5 light:border-black/8'}`}>
          <div className="max-w-[1200px] mx-auto px-[6%] h-16 flex items-center justify-between gap-6">

            {/* Logo */}
            <Link to="/" className="flex flex-col items-start">
              <span className="font-bebas text-3xl text-chalk light:text-chalk-light tracking-wider leading-none">
                TR<span className="text-fire">F</span>C
              </span>
              <span className="font-barlow-condensed font-bold text-[8px] tracking-wider text-fog light:text-fog-light leading-none mt-0.5">
                Thika Road FC
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`nav-link-underline relative font-barlow-condensed font-bold text-xs tracking-widest text-white/50 dark:text-white/50 light:text-black/50 no-underline px-4 py-1.5 transition-colors duration-200 ${
                    isActive(l.to) ? 'text-chalk light:text-chalk-light' : 'hover:text-chalk light:hover:text-chalk-light'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-2">
              <ThemeToggle />
              <Link to="/cart" className="relative flex items-center justify-center w-10 h-10 text-white/55 dark:text-white/55 light:text-black/55 no-underline border border-white/7 dark:border-white/7 light:border-black/8 clip-angled-sm transition-all duration-200 hover:text-chalk light:hover:text-chalk-light hover:border-white/15 dark:hover:border-white/15" aria-label={`Cart (${cartCount} items)`}>
                <ShoppingCart size={18} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 badge-pop bg-fire text-white font-barlow-condensed font-black text-[10px] w-4.5 h-4.5 flex items-center justify-center rounded-full">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {token ? (
                <>
                  <Link to="/account" className="font-barlow-condensed font-bold text-xs tracking-wider text-white/55 dark:text-white/55 light:text-black/55 no-underline px-3.5 py-2 border border-white/7 dark:border-white/7 light:border-black/8 transition-all duration-200 flex items-center gap-1.5 bg-transparent hover:text-chalk light:hover:text-chalk-light hover:border-white/20 dark:hover:border-white/20 clip-angled-sm">
                    Account
                  </Link>
                  <button onClick={handleLogout} className="font-barlow-condensed font-bold text-xs tracking-wider text-white/55 dark:text-white/55 light:text-black/55 no-underline px-3.5 py-2 border border-white/7 dark:border-white/7 light:border-black/8 transition-all duration-200 flex items-center gap-1.5 bg-transparent cursor-pointer hover:text-chalk light:hover:text-chalk-light hover:border-white/20 dark:hover:border-white/20 clip-angled-sm">
                    <LogOut size={13} />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="font-barlow-condensed font-bold text-xs tracking-wider text-white/55 dark:text-white/55 light:text-black/55 no-underline px-3.5 py-2 border border-white/7 dark:border-white/7 light:border-black/8 transition-all duration-200 flex items-center gap-1.5 bg-transparent hover:text-chalk light:hover:text-chalk-light hover:border-white/20 dark:hover:border-white/20 clip-angled-sm">
                    <LogIn size={13} />
                    Login
                  </Link>
                  <Link to="/register" className="font-barlow-condensed font-black text-xs tracking-wider text-white no-underline px-5 py-2 bg-fire clip-angled-lg transition-all duration-200 flex items-center gap-1.5 border-none cursor-pointer hover:bg-ember hover:scale-103">
                    <UserPlus size={13} />
                    Join
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: cart + hamburger */}
            <div className="md:hidden flex items-center gap-2">
              <Link to="/cart" className="relative flex items-center justify-center w-10 h-10 text-white/55 dark:text-white/55 light:text-black/55 no-underline border border-white/7 dark:border-white/7 light:border-black/8 clip-angled-sm" aria-label="Cart">
                <ShoppingCart size={18} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 badge-pop bg-fire text-white font-barlow-condensed font-black text-[10px] w-4.5 h-4.5 flex items-center justify-center rounded-full">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
              <button
                className="bg-transparent border border-white/10 dark:border-white/10 light:border-black/10 text-chalk light:text-chalk-light w-10 h-10 flex items-center justify-center cursor-pointer clip-angled-sm transition-all duration-200 hover:border-fire light:hover:border-fire hover:text-fire light:hover:text-fire"
                onClick={() => setIsOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-50 pointer-events-none ${isOpen ? '' : ''}`} aria-hidden={!isOpen}>
        <div className={`absolute inset-0 bg-black/70 backdrop-blur transition-opacity duration-350 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`} onClick={() => setIsOpen(false)} />
        <div className={`absolute top-0 right-0 bottom-0 w-[min(360px,90vw)] bg-ink light:bg-ink-light border-l border-white/6 dark:border-white/6 light:border-black/8 transform transition-transform duration-400 ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col pointer-events-auto overflow-y-auto`}>

          <div className="flex items-center justify-between p-6 border-b border-white/5 dark:border-white/5 light:border-black/8">
            <Link to="/" className="flex flex-col items-start" onClick={() => setIsOpen(false)}>
              <span className="font-bebas text-2xl text-chalk light:text-chalk-light tracking-wider leading-none">
                TR<span className="text-fire">F</span>C
              </span>
              <span className="font-barlow-condensed font-bold text-[8px] tracking-wider text-fog light:text-fog-light leading-none mt-0.5">
                Thika Road FC
              </span>
            </Link>
            <button className="bg-transparent border border-white/10 dark:border-white/10 light:border-black/10 text-chalk light:text-chalk-light w-9 h-9 flex items-center justify-center cursor-pointer clip-angled-sm transition-all duration-200 hover:border-fire light:hover:border-fire hover:text-fire light:hover:text-fire" onClick={() => setIsOpen(false)} aria-label="Close menu">
              <X size={16} />
            </button>
          </div>

          <div className="px-6 py-6 flex-1 flex flex-col gap-0.5">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`font-barlow-condensed font-bold text-2xl tracking-wide text-white/40 dark:text-white/40 light:text-black/40 no-underline py-2.5 border-b border-white/4 dark:border-white/4 light:border-black/4 flex items-center justify-between transition-all duration-200 ${
                  isActive(l.to) ? 'text-chalk light:text-chalk-light pl-2' : 'hover:text-chalk light:hover:text-chalk-light hover:pl-2'
                }`}
                onClick={() => setIsOpen(false)}
              >
                {l.label}
                <span className={`text-base text-fire transition-opacity duration-200 ${isActive(l.to) ? 'opacity-100' : 'opacity-0'}`}>→</span>
              </Link>
            ))}
          </div>

          {/* Drawer footer — auth actions */}
          <div className="p-6 border-t border-white/5 dark:border-white/5 light:border-black/8 flex flex-col gap-2.5">
            <div className="flex justify-center mb-2.5">
              <ThemeToggle />
            </div>
            {token ? (
              <>
                <Link to="/account" className="font-barlow-condensed font-bold text-xs tracking-wider text-white/55 no-underline px-3.5 py-3.5 border border-white/7 flex items-center justify-center bg-transparent hover:text-chalk clip-angled-lg transition-all duration-200" onClick={() => setIsOpen(false)}>
                  Account
                </Link>
                <button onClick={handleLogout} className="font-barlow-condensed font-bold text-xs tracking-wider text-white no-underline px-3.5 py-3.5 bg-fire w-full flex items-center justify-center gap-1.5 cursor-pointer hover:bg-ember clip-angled-lg transition-all duration-200">
                  <LogOut size={15} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="font-barlow-condensed font-bold text-xs tracking-wider text-white/55 dark:text-white/55 light:text-black/55 no-underline px-3.5 py-3.5 border border-white/7 dark:border-white/7 light:border-black/8 flex items-center justify-center gap-1.5 bg-transparent hover:text-chalk light:hover:text-chalk-light hover:border-white/20 dark:hover:border-white/20 clip-angled-lg transition-all duration-200"
                  onClick={() => setIsOpen(false)}
                >
                  <LogIn size={15} />
                  Login
                </Link>
                <Link
                  to="/register"
                  className="font-barlow-condensed font-black text-xs tracking-wider text-white no-underline px-3.5 py-3.5 bg-fire flex items-center justify-center gap-1.5 cursor-pointer hover:bg-ember clip-angled-lg transition-all duration-200"
                  onClick={() => setIsOpen(false)}
                >
                  <UserPlus size={15} />
                  Join the Community
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
