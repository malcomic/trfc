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
        return (_jsx("div", { className: "min-h-screen py-12 px-4 flex items-center justify-center bg-white dark:bg-[#1C1C1C]", children: _jsxs("div", { className: "text-center", children: [_jsx(Loader, { className: "w-12 h-12 animate-spin text-primary mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading equipment packages..." })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen py-12 px-4 bg-white dark:bg-[#1C1C1C]", children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsx("h1", { className: "text-4xl font-bold mb-2 text-gray-900 dark:text-white", children: "Equipment Hire" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 mb-12", children: "Rent gym equipment at affordable rates. Choose your rental period." }), error && (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8 text-red-700 dark:text-red-400", children: error })), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: packages.map((pkg) => (_jsxs("div", { className: "bg-white dark:bg-[#1C1C1C] rounded-lg shadow hover:shadow-lg transition p-6 flex flex-col border border-gray-200 dark:border-gray-700", children: [_jsx("h3", { className: "text-2xl font-bold mb-2 capitalize text-gray-900 dark:text-white", children: pkg.packageType }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 text-sm mb-6", children: pkg.description }), _jsx("div", { className: "mb-6 flex-grow", children: _jsxs("div", { className: "text-3xl font-bold text-primary", children: ["KES ", pkg.price.toLocaleString(), _jsx("span", { className: "text-sm text-gray-600 dark:text-gray-400 font-normal", children: "/day" })] }) }), _jsxs("button", { onClick: () => navigate('/equipment-checkout', {
                                    state: { packageType: pkg.packageType, pricePerDay: pkg.price },
                                }), className: "bg-primary text-white py-3 rounded-lg hover:bg-opacity-90 font-semibold flex items-center justify-center gap-2", children: ["Book Now", _jsx(ArrowRight, { className: "w-4 h-4" })] })] }, pkg.packageType))) }), _jsxs("div", { className: "mt-12 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6", children: [_jsx("h2", { className: "text-xl font-bold mb-3 text-gray-900 dark:text-white", children: "How It Works" }), _jsxs("ol", { className: "space-y-2 text-sm text-gray-700 dark:text-gray-400", children: [_jsxs("li", { children: [_jsx("strong", { children: "1. Choose Package:" }), " Select a rental period (daily, weekly, or monthly)"] }), _jsxs("li", { children: [_jsx("strong", { children: "2. Select Dates:" }), " Pick your hire and return dates"] }), _jsxs("li", { children: [_jsx("strong", { children: "3. Confirm Details:" }), " Review the total cost and equipment details"] }), _jsxs("li", { children: [_jsx("strong", { children: "4. Pay with M-Pesa:" }), " Complete payment securely"] }), _jsxs("li", { children: [_jsx("strong", { children: "5. Collect Equipment:" }), " Collect your equipment at our location"] })] })] })] }) }));
}
//# sourceMappingURL=EquipmentHire.js.map