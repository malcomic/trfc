import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getEquipmentHireById } from '../api/equipment';
import { pollPaymentStatus } from '../api/payments';
import { AlertCircle, CheckCircle, Clock, Package } from 'lucide-react';
export default function HireConfirmation() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const state = (location.state || {});
    const phoneFromUrl = searchParams.get('phone') || '';
    const [phone, setPhone] = useState(phoneFromUrl || state.phone || '');
    const [phonePrompt, setPhonePrompt] = useState(!phoneFromUrl && !state.phone);
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hire, setHire] = useState(null);
    const fetchHire = async (verifyPhone) => {
        if (!id)
            return null;
        const data = await getEquipmentHireById(id, verifyPhone);
        setHire(data);
        if (data.payment_status === 'paid')
            setPaymentStatus('paid');
        return data;
    };
    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }
        if (phonePrompt) {
            setLoading(false);
            return;
        }
        const load = async () => {
            try {
                setLoading(true);
                setError('');
                const data = await fetchHire(phone);
                const checkoutRef = data?.checkout_request_id || state.checkoutRequestId;
                if (checkoutRef && data?.payment_status !== 'paid') {
                    try {
                        await pollPaymentStatus(checkoutRef);
                        setPaymentStatus('paid');
                        await fetchHire(phone);
                    }
                    catch {
                        /* polling timeout */
                    }
                }
            }
            catch (err) {
                setError(err.response?.data?.error || 'Failed to load hire details');
            }
            finally {
                setLoading(false);
            }
        };
        load();
    }, [id, phone, phonePrompt]);
    const handlePhoneVerify = async (e) => {
        e.preventDefault();
        const normalized = phone.replace(/\s+/g, '');
        if (!/^254\d{9}$/.test(normalized)) {
            setError('Enter a valid phone number (254XXXXXXXXX)');
            return;
        }
        try {
            setLoading(true);
            setError('');
            setPhone(normalized);
            setSearchParams({ phone: normalized });
            await fetchHire(normalized);
            setPhonePrompt(false);
        }
        catch (err) {
            setError(err.response?.data?.error || 'Could not verify hire record');
        }
        finally {
            setLoading(false);
        }
    };
    const display = hire || state;
    if (phonePrompt) {
        return (_jsx("div", { className: "min-h-screen bg-night text-chalk font-barlow py-16 px-6", children: _jsxs("div", { className: "max-w-md mx-auto bg-ash border border-white/5 p-8", children: [_jsxs("h1", { className: "font-bebas text-4xl mb-2", children: ["HIRE ", _jsx("span", { className: "text-accent light:text-accent-light", children: "CONFIRMATION" })] }), _jsx("p", { className: "text-fog text-sm mb-6", children: "Enter the phone number used at checkout to view your hire." }), error && _jsx("p", { className: "text-red-400 text-sm mb-4", children: error }), _jsxs("form", { onSubmit: handlePhoneVerify, className: "space-y-4", children: [_jsx("input", { type: "tel", value: phone, onChange: (e) => setPhone(e.target.value.replace(/\s+/g, '')), placeholder: "254712345678", className: "w-full bg-smoke border border-white/10 px-4 py-3 text-chalk focus:outline-none focus:border-accent light:focus:border-accent-light" }), _jsx("button", { type: "submit", className: "w-full bg-accent light:bg-accent-light text-black light:text-white py-3 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90", children: "View Hire" })] })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen bg-night text-chalk font-barlow py-12 px-6", children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [error && (_jsxs("div", { className: "flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-6 text-sm text-red-400", children: [_jsx(AlertCircle, { size: 16, className: "flex-shrink-0 mt-0.25" }), _jsx("span", { children: error })] })), _jsxs("div", { className: `p-6 mb-6 border-l-4 ${paymentStatus === 'paid' ? 'bg-green-500/10 border-green-500' : 'bg-accent/10 light:bg-accent-light/10 border-accent light:border-accent-light'}`, children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [loading ? (_jsx("div", { className: "animate-spin rounded-full h-6 w-6 border-b-2 border-accent light:border-accent-light" })) : paymentStatus === 'paid' ? (_jsx(CheckCircle, { className: "w-6 h-6 text-green-400" })) : (_jsx(Clock, { className: "w-6 h-6 text-accent light:text-accent-light" })), _jsx("h1", { className: "font-bebas text-3xl", children: loading ? 'Confirming…' : paymentStatus === 'paid' ? 'Hire Confirmed!' : 'Payment Pending' })] }), _jsx("p", { className: "text-fog text-sm", children: paymentStatus === 'paid'
                                ? 'Your equipment hire is confirmed. Collect at our location on the hire date.'
                                : 'Complete M-Pesa payment on your phone to confirm the hire.' })] }), _jsxs("div", { className: "bg-ash border border-white/5 p-6 mb-6 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-accent light:text-accent-light mb-4", children: [_jsx(Package, { size: 18 }), _jsx("h2", { className: "font-barlow-condensed font-bold tracking-widest uppercase", children: "Hire Details" })] }), (display.equipment_name || display.equipmentName) && (_jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Equipment: " }), display.equipment_name || display.equipmentName] })), (display.hire_date || display.hireDate) && (_jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Hire date: " }), new Date(display.hire_date || display.hireDate).toLocaleDateString()] })), (display.return_date || display.returnDate) && (_jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Return date: " }), new Date(display.return_date || display.returnDate).toLocaleDateString()] })), (display.total_cost != null || display.totalPrice != null) && (_jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Total: " }), "KES ", Number(display.total_cost ?? display.totalPrice).toLocaleString()] })), phone && _jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Phone: " }), phone] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => navigate('/equipment'), className: "flex-1 bg-accent light:bg-accent-light text-black light:text-white py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase hover:bg-accent/90 light:hover:bg-accent-light/90", children: "Back to Equipment" }), paymentStatus === 'pending' && !loading && (_jsx("button", { onClick: () => window.location.reload(), className: "flex-1 bg-smoke border border-white/10 py-3 font-barlow-condensed font-bold text-sm hover:border-accent light:hover:border-accent-light", children: "Refresh" }))] }), paymentStatus === 'pending' && !loading && (_jsxs("div", { className: "mt-6 flex gap-3 bg-red-500/10 border border-red-500/20 p-4 text-sm", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-400 flex-shrink-0" }), _jsx("p", { className: "text-red-300", children: "Payment not confirmed yet. Check your phone for the M-Pesa prompt." })] }))] }) }));
}
//# sourceMappingURL=HireConfirmation.js.map