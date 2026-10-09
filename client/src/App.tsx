import {
  createBrowserRouter,
  createRoutesFromElements,
  Outlet,
  Route,
  RouterProvider,
  ScrollRestoration,
  useLocation,
} from 'react-router-dom'
import { useEffect, useRef } from 'react'
import PrivateRoute from './components/PrivateRoute'
import PublicLayout from './components/PublicLayout'
import AdminLayout from './components/AdminLayout'
import Home from './pages/Home'
import About from './pages/About'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import EventCheckout from './pages/EventCheckout'
import TicketConfirmation from './pages/TicketConfirmation'
import MedalDetail from './pages/MedalDetail'
import MedalCheckout from './pages/MedalCheckout'
import MedalConfirmation from './pages/MedalConfirmation'
import MyMedals from './pages/MyMedals'
import Medals from './pages/Medals'
import Shop from './pages/Shop'
import ShopCategory from './pages/ShopCategory'
import ProductDetail from './pages/ProductDetail'
import FlashSales from './pages/FlashSales'
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
import AdminProductCategories from './pages/admin/AdminProductCategories'
import AdminFlashSales from './pages/admin/AdminFlashSales'
import AdminGallery from './pages/admin/AdminGallery'
import AdminOrders from './pages/admin/AdminOrders'
import AdminUsers from './pages/admin/AdminUsers'
import AdminTestimonials from './pages/admin/AdminTestimonials'
import AdminEquipment from './pages/admin/AdminEquipment'
import AdminTickets from './pages/admin/AdminTickets'
import AdminPartnerships from './pages/admin/AdminPartnerships'
import AdminSponsorshipTiers from './pages/admin/AdminSponsorshipTiers'
import AdminSignups from './pages/admin/AdminSignups'
import AdminMedals from './pages/admin/AdminMedals'
import AdminAppearance from './pages/admin/AdminAppearance'
import AdminScan from './pages/admin/AdminScan'
import AdminCaptains from './pages/admin/AdminCaptains'
import AdminRegions from './pages/admin/AdminRegions'
import CaptainDashboard from './pages/CaptainDashboard'
import { captureReferralFromUrl } from './utils/referral'

function TikTokPixelTracker() {
  const location = useLocation()
  const lastPageRef = useRef<string | null>(null)

  useEffect(() => {
    const page = `${location.pathname}${location.search}${location.hash}`
    const lastGlobalPage = (window as any).__ttq_last_page as string | undefined

    // Guard against React 18 StrictMode double-invoking effects in development.
    if (lastGlobalPage === page || lastPageRef.current === page) return

    lastPageRef.current = page
    ;(window as any).__ttq_last_page = page

    window.ttq?.page?.()
  }, [location.pathname, location.search, location.hash])

  return null
}

function ReferralCapture() {
  const { search } = useLocation()
  useEffect(() => {
    captureReferralFromUrl(search)
  }, [search])
  return null
}

function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <TikTokPixelTracker />
      <ReferralCapture />
      <Outlet />
    </>
  )
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/scan"
          element={
            <PrivateRoute roles={['admin', 'scanner']} loginPath="/admin/login">
              <AdminScan />
            </PrivateRoute>
          }
        />
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
          <Route path="products/categories" element={<AdminProductCategories />} />
          <Route path="products/flash-sales" element={<AdminFlashSales />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="testimonials" element={<AdminTestimonials />} />
          <Route path="equipment" element={<AdminEquipment />} />
          <Route path="tickets" element={<AdminTickets />} />
          <Route path="medals" element={<AdminMedals />} />
          <Route path="partnerships" element={<AdminPartnerships />} />
          <Route path="sponsorship-tiers" element={<AdminSponsorshipTiers />} />
          <Route path="signups" element={<AdminSignups />} />
          <Route path="appearance" element={<AdminAppearance />} />
          <Route path="captains" element={<AdminCaptains />} />
          <Route path="captains/regions" element={<AdminRegions />} />
          <Route path="zones" element={<AdminRegions standalone />} />
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/partnerships" element={<Partnerships />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:eventId/checkout" element={<EventCheckout />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/ticket-confirmation/:checkoutRequestId" element={<TicketConfirmation />} />
          <Route path="/medals" element={<Medals />} />
          <Route path="/medals/:slug/checkout" element={<MedalCheckout />} />
          <Route path="/medals/:slug" element={<MedalDetail />} />
          <Route path="/medal-confirmation/:checkoutRequestId" element={<MedalConfirmation />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/testimonials" element={<Testimonials />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/c/:slug" element={<ShopCategory />} />
          <Route path="/shop/:id" element={<ProductDetail />} />
          <Route path="/flash-sales" element={<FlashSales />} />
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
          <Route path="/account/medals" element={<PrivateRoute><MyMedals /></PrivateRoute>} />
          <Route path="/captain" element={<PrivateRoute role="captain"><CaptainDashboard /></PrivateRoute>} />
        </Route>

        <Route path="*" element={<NotFound />} />
    </Route>
  ),
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
)

function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />
}

export default App
