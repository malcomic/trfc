import { Mail, Phone, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Footer() {
  const { user } = useAuth()
  const isAdmin = user && user.role === 'admin'

  return (
    <footer className="bg-dark text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
        <div>
          <h3 className="text-primary font-bold text-lg mb-4">TRFC</h3>
          <p className="text-gray-300">Thika Road Fitness Community - Building a stronger community together.</p>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Quick Links</h4>
          <ul className="space-y-2 text-gray-300">
            <li><Link to="/events" className="hover:text-primary transition">Events</Link></li>
            <li><Link to="/shop" className="hover:text-primary transition">Shop</Link></li>
            <li><a href="#" className="hover:text-primary transition">Contact</a></li>
            <li><Link to="/admin/login" className="hover:text-primary transition">Admin Login</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Contact</h4>
          <div className="space-y-2 text-gray-300">
            <div className="flex items-center gap-2">
              <Mail size={18} />
              <span>info@trfc.ke</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={18} />
              <span>+254 712 345 678</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={18} />
              <span>Thika Road, Nairobi</span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div>
            <h4 className="font-semibold mb-4 text-primary">Admin Panel</h4>
            <ul className="space-y-2 text-gray-300">
              <li><Link to="/admin" className="hover:text-primary transition">Dashboard</Link></li>
              <li><Link to="/admin/events" className="hover:text-primary transition">Manage Events</Link></li>
              <li><Link to="/admin/products" className="hover:text-primary transition">Manage Products</Link></li>
              <li><Link to="/admin/gallery" className="hover:text-primary transition">Manage Gallery</Link></li>
              <li><Link to="/admin/orders" className="hover:text-primary transition">View Orders</Link></li>
              <li><Link to="/admin/users" className="hover:text-primary transition">Manage Users</Link></li>
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-gray-700 py-6 text-center text-gray-400">
        <p>&copy; 2024 TRFC. All rights reserved.</p>
      </div>
    </footer>
  )
}
