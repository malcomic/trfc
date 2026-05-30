import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getEquipmentHireById } from '../api/equipment';
import { pollPaymentStatus } from '../api/payments';
import { AlertCircle, CheckCircle, Clock, Package } from 'lucide-react';
export default function HireConfirmation() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state || {});
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [hire, setHire] = useState(null);
    const checkoutRequestId = state.checkoutRequestId;
    useEffect(() => {
        const load = async () => {
            try {
                if (id && state.phone) {
                    const data = await getEquipmentHireById(id, state.phone);
                    setHire(data);
                    if (data.payment_status === 'paid')
                        setPaymentStatus('paid');
                }
                if (checkoutRequestId && paymentStatus !== 'paid') {
                    try {
                        await pollPaymentStatus(checkoutRequestId);
                        setPaymentStatus('paid');
                        if (id && state.phone) {
                            const updated = await getEquipmentHireById(id, state.phone);
                            setHire(updated);
                        }
                    }
                    catch {
                        /* polling timeout */
                    }
                }
            }
            finally {
                setLoading(false);
            }
        };
        load();
    }, [id, checkoutRequestId, state.phone]);
    const display = hire || state;
    return (_jsx("div", { className: "min-h-screen bg-night text-chalk font-barlow py-12 px-6", children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [_jsxs("div", { className: `p-6 mb-6 border-l-4 ${paymentStatus === 'paid' ? 'bg-green-500/10 border-green-500' : 'bg-fire/10 border-fire'}`, children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [loading ? (_jsx("div", { className: "animate-spin rounded-full h-6 w-6 border-b-2 border-fire" })) : paymentStatus === 'paid' ? (_jsx(CheckCircle, { className: "w-6 h-6 text-green-400" })) : (_jsx(Clock, { className: "w-6 h-6 text-fire" })), _jsx("h1", { className: "font-bebas text-3xl", children: loading ? 'Confirming…' : paymentStatus === 'paid' ? 'Hire Confirmed!' : 'Payment Pending' })] }), _jsx("p", { className: "text-fog text-sm", children: paymentStatus === 'paid'
                                ? 'Your equipment hire is confirmed. Collect at our location on the hire date.'
                                : 'Complete M-Pesa payment on your phone to confirm the hire.' })] }), _jsxs("div", { className: "bg-ash border border-white/5 p-6 mb-6 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-fire mb-4", children: [_jsx(Package, { size: 18 }), _jsx("h2", { className: "font-barlow-condensed font-bold letter-spacing-widest text-transform-uppercase", children: "Hire Details" })] }), (display.equipment_name || display.equipmentName) && (_jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Equipment: " }), display.equipment_name || display.equipmentName] })), (display.hire_date || display.hireDate) && (_jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Hire date: " }), new Date(display.hire_date || display.hireDate).toLocaleDateString()] })), (display.return_date || display.returnDate) && (_jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Return date: " }), new Date(display.return_date || display.returnDate).toLocaleDateString()] })), (display.total_cost != null || display.totalPrice != null) && (_jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Total: " }), "KES ", Number(display.total_cost ?? display.totalPrice).toLocaleString()] })), state.phone && _jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Phone: " }), state.phone] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => navigate('/equipment'), className: "flex-1 bg-fire text-white py-3 clip-angled font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase hover:bg-ember", children: "Back to Equipment" }), paymentStatus === 'pending' && !loading && (_jsx("button", { onClick: () => window.location.reload(), className: "flex-1 bg-smoke border border-white/10 py-3 font-barlow-condensed font-bold text-sm hover:border-fire", children: "Refresh" }))] }), paymentStatus === 'pending' && !loading && (_jsxs("div", { className: "mt-6 flex gap-3 bg-red-500/10 border border-red-500/20 p-4 text-sm", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-400 flex-shrink-0" }), _jsx("p", { className: "text-red-300", children: "Payment not confirmed yet. Check your phone for the M-Pesa prompt." })] }))] }) }));
}
//# sourceMappingURL=HireConfirmation.js.map