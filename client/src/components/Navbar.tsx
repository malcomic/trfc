import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../store/cartStore'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { token, logout } = useAuth()
  const { items } = useCart()
  const navigate = useNavigate()
  const cartCount = items.length

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-50 bg-dark text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="font-bold text-2xl text-primary">TRFC</Link>

        <div className="hidden md:flex gap-8 items-center">
          <Link to="/" className="hover:text-primary transition">Home</Link>
          <Link to="/events" className="hover:text-primary transition">Events</Link>
          <Link to="/shop" className="hover:text-primary transition">Shop</Link>
          <Link to="/cart" className="hover:text-primary transition relative flex items-center gap-2">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          {token ? (
            <>
              <button onClick={handleLogout} className="bg-primary px-4 py-2 rounded-lg hover:bg-opacity-90 transition">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-primary transition">Login</Link>
              <Link to="/register" className="bg-primary px-4 py-2 rounded-lg hover:bg-opacity-90 transition">Register</Link>
            </>
          )}
        </div>

        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden">
          <span className="text-2xl">☰</span>
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden bg-dark-200 flex flex-col gap-4 p-4">
          <Link to="/" className="hover:text-primary">Home</Link>
          <Link to="/events" className="hover:text-primary">Events</Link>
          <Link to="/shop" className="hover:text-primary">Shop</Link>
          <Link to="/cart" className="hover:text-primary flex items-center gap-2">
            <ShoppingCart size={20} />
            Cart {cartCount > 0 && `(${cartCount})`}
          </Link>
          {token ? (
            <>
              <button onClick={handleLogout} className="bg-primary px-4 py-2 rounded-lg text-left">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-primary">Login</Link>
              <Link to="/register" className="bg-primary px-4 py-2 rounded-lg text-left">Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
