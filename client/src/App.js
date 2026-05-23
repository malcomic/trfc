import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Shop from './pages/Shop';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Register from './pages/Register';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Gallery from './pages/Gallery';
import Programs from './pages/Programs';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminReports from './pages/AdminReports';
import AdminEvents from './pages/admin/AdminEvents';
import AdminProducts from './pages/admin/AdminProducts';
import AdminGallery from './pages/admin/AdminGallery';
import AdminOrders from './pages/admin/AdminOrders';
import AdminUsers from './pages/admin/AdminUsers';
function App() {
    return (_jsx(BrowserRouter, { future: {
            v7_startTransition: true,
            v7_relativeSplatPath: true,
        }, children: _jsxs("div", { className: "flex flex-col min-h-screen", children: [_jsx(Navbar, {}), _jsx("main", { className: "flex-grow", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/events", element: _jsx(Events, {}) }), _jsx(Route, { path: "/events/:id", element: _jsx(EventDetail, {}) }), _jsx(Route, { path: "/gallery", element: _jsx(Gallery, {}) }), _jsx(Route, { path: "/programs", element: _jsx(Programs, {}) }), _jsx(Route, { path: "/shop", element: _jsx(Shop, {}) }), _jsx(Route, { path: "/cart", element: _jsx(Cart, {}) }), _jsx(Route, { path: "/checkout", element: _jsx(Checkout, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), _jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/admin/login", element: _jsx(AdminLogin, {}) }), _jsx(Route, { path: "/admin", element: _jsx(PrivateRoute, { role: "admin", children: _jsx(AdminLayout, { children: _jsx(AdminDashboard, {}) }) }) }), _jsx(Route, { path: "/admin/analytics", element: _jsx(PrivateRoute, { role: "admin", children: _jsx(AdminLayout, { children: _jsx(AdminAnalytics, {}) }) }) }), _jsx(Route, { path: "/admin/reports", element: _jsx(PrivateRoute, { role: "admin", children: _jsx(AdminLayout, { children: _jsx(AdminReports, {}) }) }) }), _jsx(Route, { path: "/admin/events", element: _jsx(PrivateRoute, { role: "admin", children: _jsx(AdminLayout, { children: _jsx(AdminEvents, {}) }) }) }), _jsx(Route, { path: "/admin/products", element: _jsx(PrivateRoute, { role: "admin", children: _jsx(AdminLayout, { children: _jsx(AdminProducts, {}) }) }) }), _jsx(Route, { path: "/admin/gallery", element: _jsx(PrivateRoute, { role: "admin", children: _jsx(AdminLayout, { children: _jsx(AdminGallery, {}) }) }) }), _jsx(Route, { path: "/admin/orders", element: _jsx(PrivateRoute, { role: "admin", children: _jsx(AdminLayout, { children: _jsx(AdminOrders, {}) }) }) }), _jsx(Route, { path: "/admin/users", element: _jsx(PrivateRoute, { role: "admin", children: _jsx(AdminLayout, { children: _jsx(AdminUsers, {}) }) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/" }) })] }) }), _jsx(Footer, {})] }) }));
}
export default App;
//# sourceMappingURL=App.js.map