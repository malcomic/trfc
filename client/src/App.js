import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import PublicLayout from './components/PublicLayout';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import About from './pages/About';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import EventCheckout from './pages/EventCheckout';
import TicketConfirmation from './pages/TicketConfirmation';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import EquipmentHire from './pages/EquipmentHire';
import EquipmentCheckout from './pages/EquipmentCheckout';
import HireConfirmation from './pages/HireConfirmation';
import Register from './pages/Register';
import Login from './pages/Login';
import Account from './pages/Account';
import PaymentHistory from './pages/PaymentHistory';
import MyTickets from './pages/MyTickets';
import AdminLogin from './pages/AdminLogin';
import Gallery from './pages/Gallery';
import Programs from './pages/Programs';
import Testimonials from './pages/Testimonials';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Partnerships from './pages/Partnerships';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminReports from './pages/AdminReports';
import AdminEvents from './pages/admin/AdminEvents';
import AdminProducts from './pages/admin/AdminProducts';
import AdminGallery from './pages/admin/AdminGallery';
import AdminOrders from './pages/admin/AdminOrders';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTestimonials from './pages/admin/AdminTestimonials';
import AdminEquipment from './pages/admin/AdminEquipment';
import AdminTickets from './pages/admin/AdminTickets';
import AdminPartnerships from './pages/admin/AdminPartnerships';
import AdminSponsorshipTiers from './pages/admin/AdminSponsorshipTiers';
import AdminAppearance from './pages/admin/AdminAppearance';
function App() {
    return (_jsx(BrowserRouter, { future: {
            v7_startTransition: true,
            v7_relativeSplatPath: true,
        }, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/admin/login", element: _jsx(AdminLogin, {}) }), _jsxs(Route, { path: "/admin", element: _jsx(PrivateRoute, { role: "admin", loginPath: "/admin/login", children: _jsx(AdminLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(AdminDashboard, {}) }), _jsx(Route, { path: "analytics", element: _jsx(AdminAnalytics, {}) }), _jsx(Route, { path: "reports", element: _jsx(AdminReports, {}) }), _jsx(Route, { path: "events", element: _jsx(AdminEvents, {}) }), _jsx(Route, { path: "products", element: _jsx(AdminProducts, {}) }), _jsx(Route, { path: "gallery", element: _jsx(AdminGallery, {}) }), _jsx(Route, { path: "orders", element: _jsx(AdminOrders, {}) }), _jsx(Route, { path: "users", element: _jsx(AdminUsers, {}) }), _jsx(Route, { path: "testimonials", element: _jsx(AdminTestimonials, {}) }), _jsx(Route, { path: "equipment", element: _jsx(AdminEquipment, {}) }), _jsx(Route, { path: "tickets", element: _jsx(AdminTickets, {}) }), _jsx(Route, { path: "partnerships", element: _jsx(AdminPartnerships, {}) }), _jsx(Route, { path: "sponsorship-tiers", element: _jsx(AdminSponsorshipTiers, {}) }), _jsx(Route, { path: "appearance", element: _jsx(AdminAppearance, {}) })] }), _jsxs(Route, { element: _jsx(PublicLayout, {}), children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/about", element: _jsx(About, {}) }), _jsx(Route, { path: "/partnerships", element: _jsx(Partnerships, {}) }), _jsx(Route, { path: "/events", element: _jsx(Events, {}) }), _jsx(Route, { path: "/events/:eventId/checkout", element: _jsx(EventCheckout, {}) }), _jsx(Route, { path: "/events/:id", element: _jsx(EventDetail, {}) }), _jsx(Route, { path: "/ticket-confirmation/:checkoutRequestId", element: _jsx(TicketConfirmation, {}) }), _jsx(Route, { path: "/gallery", element: _jsx(Gallery, {}) }), _jsx(Route, { path: "/programs", element: _jsx(Programs, {}) }), _jsx(Route, { path: "/testimonials", element: _jsx(Testimonials, {}) }), _jsx(Route, { path: "/contact", element: _jsx(Contact, {}) }), _jsx(Route, { path: "/privacy", element: _jsx(Privacy, {}) }), _jsx(Route, { path: "/terms", element: _jsx(Terms, {}) }), _jsx(Route, { path: "/shop", element: _jsx(Shop, {}) }), _jsx(Route, { path: "/shop/:id", element: _jsx(ProductDetail, {}) }), _jsx(Route, { path: "/cart", element: _jsx(Cart, {}) }), _jsx(Route, { path: "/checkout", element: _jsx(Checkout, {}) }), _jsx(Route, { path: "/order-confirmation/:orderId", element: _jsx(OrderConfirmation, {}) }), _jsx(Route, { path: "/equipment", element: _jsx(EquipmentHire, {}) }), _jsx(Route, { path: "/equipment/checkout", element: _jsx(EquipmentCheckout, {}) }), _jsx(Route, { path: "/hire-confirmation/:id", element: _jsx(HireConfirmation, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), _jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/account", element: _jsx(PrivateRoute, { children: _jsx(Account, {}) }) }), _jsx(Route, { path: "/account/payments", element: _jsx(PrivateRoute, { children: _jsx(PaymentHistory, {}) }) }), _jsx(Route, { path: "/account/tickets", element: _jsx(PrivateRoute, { children: _jsx(MyTickets, {}) }) })] }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] }) }));
}
export default App;
//# sourceMappingURL=App.js.map