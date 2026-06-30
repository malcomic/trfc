import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PrivateRoute from './components/PrivateRoute'
import PublicLayout from './components/PublicLayout'
import AdminLayout from './components/AdminLayout'
import Home from './pages/Home'
import About from './pages/About'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import EventCheckout from './pages/EventCheckout'
import TicketConfirmation from './pages/TicketConfirmation'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import EquipmentHire from './pages/EquipmentHire'
import EquipmentCheckout from './pages/EquipmentCheckout'
import HireConfirmation from './pages/HireConfirmation'
import Register from './pages/Register'
import Login from './pages/Login'
import Account from './pages/Account'
import PaymentHistory from './pages/PaymentHistory'
import MyTickets from './pages/MyTickets'
import AdminLogin from './pages/AdminLogin'
import Gallery from './pages/Gallery'
import Programs from './pages/Programs'
import Testimonials from './pages/Testimonials'
import Contact from './pages/Contact'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Partnerships from './pages/Partnerships'
import NotFound from './pages/NotFound'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminAnalytics from './pages/AdminAnalytics'
import AdminReports from './pages/AdminReports'
import AdminEvents from './pages/admin/AdminEvents'
import AdminProducts from './pages/admin/AdminProducts'
import AdminGallery from './pages/admin/AdminGallery'
import AdminOrders from './pages/admin/AdminOrders'
import AdminUsers from './pages/admin/AdminUsers'
import AdminTestimonials from './pages/admin/AdminTestimonials'
import AdminEquipment from './pages/admin/AdminEquipment'
import AdminTickets from './pages/admin/AdminTickets'
import AdminPartnerships from './pages/admin/AdminPartnerships'
import AdminSponsorshipTiers from './pages/admin/AdminSponsorshipTiers'
import AdminAppearance from './pages/admin/AdminAppearance'

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <PrivateRoute role="admin" loginPath="/admin/login">
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="testimonials" element={<AdminTestimonials />} />
          <Route path="equipment" element={<AdminEquipment />} />
          <Route path="tickets" element={<AdminTickets />} />
          <Route path="partnerships" element={<AdminPartnerships />} />
          <Route path="sponsorship-tiers" element={<AdminSponsorshipTiers />} />
          <Route path="appearance" element={<AdminAppearance />} />
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/partnerships" element={<Partnerships />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:eventId/checkout" element={<EventCheckout />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/ticket-confirmation/:checkoutRequestId" element={<TicketConfirmation />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/testimonials" element={<Testimonials />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
          <Route path="/equipment" element={<EquipmentHire />} />
          <Route path="/equipment/checkout" element={<EquipmentCheckout />} />
          <Route path="/hire-confirmation/:id" element={<HireConfirmation />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />
          <Route path="/account/payments" element={<PrivateRoute><PaymentHistory /></PrivateRoute>} />
          <Route path="/account/tickets" element={<PrivateRoute><MyTickets /></PrivateRoute>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
