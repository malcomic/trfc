import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableEquipment } from '../api/equipment';
import { ArrowRight, Loader, AlertCircle } from 'lucide-react';
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
                setError(err.response?.data?.error || 'Failed to load equipment packages');
            }
            finally {
                setLoading(false);
            }
        };
        fetchPackages();
    }, []);
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-night text-chalk flex items-center justify-center", children: _jsx(Loader, { className: "w-12 h-12 animate-spin text-accent light:text-accent-light" }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-night text-chalk font-barlow", children: [_jsx("section", { className: "bg-ink border-b border-white/5 px-[6%] pt-14 pb-11", children: _jsxs("div", { className: "max-w-5xl mx-auto", children: [_jsxs("h1", { className: "font-bebas text-5xl", children: ["EQUIPMENT ", _jsx("span", { className: "text-accent light:text-accent-light", children: "HIRE" })] }), _jsx("p", { className: "text-fog mt-2", children: "Rent gym equipment at affordable rates" })] }) }), _jsxs("div", { className: "max-w-5xl mx-auto px-[6%] py-10 pb-20", children: [error && (_jsxs("div", { className: "bg-red-500/10 border border-red-500/20 p-4 mb-8 flex gap-3 text-red-300 text-sm", children: [_jsx(AlertCircle, { size: 18, className: "flex-shrink-0" }), " ", error] })), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: packages.map((pkg) => (_jsxs("div", { className: "bg-ash border border-white/5 p-6 flex flex-col hover:border-accent/30 light:hover:border-accent-light/30 transition", children: [_jsx("h3", { className: "font-barlow-condensed font-bold text-2xl capitalize mb-2", children: pkg.packageType }), _jsx("p", { className: "text-fog text-sm mb-6 flex-1", children: pkg.description }), _jsxs("p", { className: "font-bebas text-3xl text-accent light:text-accent-light mb-6", children: ["KES ", pkg.price.toLocaleString(), _jsx("span", { className: "text-sm text-fog font-barlow", children: "/day" })] }), _jsxs("button", { onClick: () => navigate('/equipment/checkout', { state: { packageType: pkg.packageType, pricePerDay: pkg.price } }), className: "w-full bg-accent light:bg-accent-light text-black light:text-white py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase hover:bg-accent/90 light:hover:bg-accent-light/90 flex items-center justify-center gap-2", children: ["Book Now ", _jsx(ArrowRight, { size: 16 })] })] }, pkg.packageType))) })] })] }));
}
//# sourceMappingURL=EquipmentHire.js.map