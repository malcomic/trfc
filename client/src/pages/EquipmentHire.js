import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableEquipment } from '../api/equipment';
import { ArrowRight, Loader } from 'lucide-react';
export default function EquipmentHire() {
    const navigate = useNavigate();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        const fetchPackages = async () => {
            try {
                setLoading(true);
                const data = await getAvailableEquipment();
                setPackages(data);
            }
            catch (err) {
                console.error('Error fetching equipment:', err);
                setError(err.response?.data?.error || 'Failed to load equipment packages');
            }
            finally {
                setLoading(false);
            }
        };
        fetchPackages();
    }, []);
    if (loading) {
        return (_jsx("div", { className: "min-h-screen py-12 px-4 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx(Loader, { className: "w-12 h-12 animate-spin text-primary mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "Loading equipment packages..." })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen py-12 px-4", children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsx("h1", { className: "text-4xl font-bold mb-2", children: "Equipment Hire" }), _jsx("p", { className: "text-gray-600 mb-12", children: "Rent gym equipment at affordable rates. Choose your rental period." }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-red-700", children: error })), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: packages.map((pkg) => (_jsxs("div", { className: "bg-white rounded-lg shadow hover:shadow-lg transition p-6 flex flex-col", children: [_jsx("h3", { className: "text-2xl font-bold mb-2 capitalize", children: pkg.packageType }), _jsx("p", { className: "text-gray-600 text-sm mb-6", children: pkg.description }), _jsx("div", { className: "mb-6 flex-grow", children: _jsxs("div", { className: "text-3xl font-bold text-primary", children: ["KES ", pkg.price.toLocaleString(), _jsx("span", { className: "text-sm text-gray-600 font-normal", children: "/day" })] }) }), _jsxs("button", { onClick: () => navigate('/equipment-checkout', {
                                    state: { packageType: pkg.packageType, pricePerDay: pkg.price },
                                }), className: "bg-primary text-white py-3 rounded-lg hover:bg-opacity-90 font-semibold flex items-center justify-center gap-2", children: ["Book Now", _jsx(ArrowRight, { className: "w-4 h-4" })] })] }, pkg.packageType))) }), _jsxs("div", { className: "mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6", children: [_jsx("h2", { className: "text-xl font-bold mb-3", children: "How It Works" }), _jsxs("ol", { className: "space-y-2 text-sm text-gray-700", children: [_jsxs("li", { children: [_jsx("strong", { children: "1. Choose Package:" }), " Select a rental period (daily, weekly, or monthly)"] }), _jsxs("li", { children: [_jsx("strong", { children: "2. Select Dates:" }), " Pick your hire and return dates"] }), _jsxs("li", { children: [_jsx("strong", { children: "3. Confirm Details:" }), " Review the total cost and equipment details"] }), _jsxs("li", { children: [_jsx("strong", { children: "4. Pay with M-Pesa:" }), " Complete payment securely"] }), _jsxs("li", { children: [_jsx("strong", { children: "5. Collect Equipment:" }), " Collect your equipment at our location"] })] })] })] }) }));
}
//# sourceMappingURL=EquipmentHire.js.map