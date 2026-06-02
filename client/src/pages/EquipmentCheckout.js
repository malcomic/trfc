import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { createEquipmentHireRequest, initiateEquipmentPayment } from '../api/equipment';
import PaymentStatusModal from '../components/PaymentStatusModal';
import { AlertCircle, Loader, Calendar } from 'lucide-react';
export default function EquipmentCheckout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors }, watch } = useForm({
        defaultValues: {
            equipmentName: 'Gym Equipment',
            hireDate: '',
            returnDate: '',
            phone: '',
        },
    });
    const state = location.state || {};
    const packageType = state.packageType || 'daily';
    const pricePerDay = state.pricePerDay || 500;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [checkoutRequestId, setCheckoutRequestId] = useState('');
    const [phone, setPhone] = useState('');
    const [hireId, setHireId] = useState('');
    const [hireMeta, setHireMeta] = useState(null);
    const hireDate = watch('hireDate');
    const returnDate = watch('returnDate');
    const calculateDays = () => {
        if (!hireDate || !returnDate)
            return 0;
        const start = new Date(hireDate);
        const end = new Date(returnDate);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    };
    const days = calculateDays();
    const totalPrice = days > 0 ? days * pricePerDay : 0;
    const onSubmit = async (data) => {
        try {
            setLoading(true);
            setError('');
            setPhone(data.phone);
            // Create hire request first
            const hireRequest = await createEquipmentHireRequest({
                equipmentName: data.equipmentName,
                packageType: packageType,
                hireDate: data.hireDate,
                returnDate: data.returnDate,
                phone: data.phone,
            });
            // Initiate payment
            const paymentResponse = await initiateEquipmentPayment({
                phone: data.phone,
                amount: Math.round(totalPrice),
                equipmentHireId: hireRequest.id,
            });
            if (paymentResponse.checkoutRequestId) {
                setCheckoutRequestId(paymentResponse.checkoutRequestId);
                setPhone(data.phone);
                setHireId(hireRequest.id);
                setHireMeta({
                    equipmentName: data.equipmentName,
                    hireDate: data.hireDate,
                    returnDate: data.returnDate,
                    totalPrice,
                });
                setShowPaymentModal(true);
            }
            else {
                setError('Failed to initiate payment. Please try again.');
            }
        }
        catch (err) {
            console.error('Booking failed:', err);
            setError(err.response?.data?.error || 'Equipment hire booking failed. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    const today = new Date().toISOString().split('T')[0];
    const handlePaymentModalClose = () => {
        setShowPaymentModal(false);
        if (hireId) {
            const params = new URLSearchParams({ phone });
            navigate(`/hire-confirmation/${hireId}?${params.toString()}`, {
                state: {
                    checkoutRequestId,
                    equipmentName: hireMeta?.equipmentName,
                    hireDate: hireMeta?.hireDate,
                    returnDate: hireMeta?.returnDate,
                    totalPrice: hireMeta?.totalPrice,
                    phone,
                },
            });
        }
    };
    return (_jsxs("div", { className: "min-h-screen py-12 px-4 bg-gray-50 dark:bg-gray-900", children: [_jsxs("div", { className: "max-w-2xl mx-auto", children: [_jsxs("div", { className: "mb-6", children: [_jsx("button", { onClick: () => navigate('/equipment'), className: "text-primary hover:underline text-sm mb-4", children: "\u2190 Back to Equipment" }), _jsx("h1", { className: "text-3xl font-bold mb-2 text-gray-900 dark:text-white", children: "Book Equipment" }), _jsxs("p", { className: "text-gray-600 dark:text-gray-400 capitalize", children: [packageType, " Rental Package - KES ", pricePerDay, "/day"] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsx("form", { onSubmit: handleSubmit(onSubmit), className: "md:col-span-2", children: _jsxs("div", { className: "bg-white dark:bg-[#1C1C1C] rounded-lg shadow p-6 space-y-4", children: [_jsx("h2", { className: "text-xl font-bold mb-4 text-gray-900 dark:text-white", children: "Booking Details" }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2 text-gray-900 dark:text-white", children: "Equipment Name" }), _jsx("input", { ...register('equipmentName', {
                                                        required: 'Equipment name is required',
                                                    }), type: "text", placeholder: "e.g., Dumbbells, Treadmill", className: "w-full border border-gray-300 dark:border-gray-700 rounded px-4 py-2 bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary" }), errors.equipmentName && (_jsx("p", { className: "text-red-600 dark:text-red-400 text-sm mt-1", children: errors.equipmentName.message }))] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2 text-gray-900 dark:text-white", children: "Hire Date" }), _jsxs("div", { className: "relative", children: [_jsx(Calendar, { className: "absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" }), _jsx("input", { ...register('hireDate', {
                                                                        required: 'Hire date is required',
                                                                    }), type: "date", min: today, className: "w-full border border-gray-300 dark:border-gray-700 rounded px-4 py-2 pl-10 bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white focus:outline-none focus:border-primary" })] }), errors.hireDate && (_jsx("p", { className: "text-red-600 dark:text-red-400 text-sm mt-1", children: errors.hireDate.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2 text-gray-900 dark:text-white", children: "Return Date" }), _jsxs("div", { className: "relative", children: [_jsx(Calendar, { className: "absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" }), _jsx("input", { ...register('returnDate', {
                                                                        required: 'Return date is required',
                                                                    }), type: "date", min: hireDate || today, className: "w-full border border-gray-300 dark:border-gray-700 rounded px-4 py-2 pl-10 bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white focus:outline-none focus:border-primary" })] }), errors.returnDate && (_jsx("p", { className: "text-red-600 dark:text-red-400 text-sm mt-1", children: errors.returnDate.message }))] })] }), _jsx("h2", { className: "text-xl font-bold mt-6 mb-4 text-gray-900 dark:text-white", children: "Payment Details" }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2 text-gray-900 dark:text-white", children: "Phone Number (254XXXXXXXXX)" }), _jsx("input", { ...register('phone', {
                                                        required: 'Phone number is required',
                                                        pattern: {
                                                            value: /^254\d{9}$/,
                                                            message: 'Phone must be in format 254XXXXXXXXX',
                                                        },
                                                    }), type: "text", placeholder: "254712345678", className: "w-full border border-gray-300 dark:border-gray-700 rounded px-4 py-2 bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary" }), errors.phone && (_jsx("p", { className: "text-red-600 dark:text-red-400 text-sm mt-1", children: errors.phone.message }))] }), error && (_jsxs("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 flex gap-3", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" }), _jsx("p", { className: "text-red-700 dark:text-red-400 text-sm", children: error })] })), _jsx("button", { type: "submit", disabled: loading || totalPrice === 0, className: "w-full bg-primary text-white py-3 rounded-lg hover:bg-opacity-90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader, { className: "w-4 h-4 animate-spin" }), "Processing..."] })) : ('Proceed to Payment') })] }) }), _jsx("div", { className: "md:col-span-1", children: _jsxs("div", { className: "bg-white dark:bg-[#1C1C1C] rounded-lg shadow p-6 sticky top-4", children: [_jsx("h3", { className: "text-lg font-bold mb-4 text-gray-900 dark:text-white", children: "Booking Summary" }), _jsxs("div", { className: "space-y-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700", children: [_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-700 dark:text-gray-300", children: "Package Type" }), _jsx("span", { className: "font-semibold capitalize text-gray-900 dark:text-white", children: packageType })] }), _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-700 dark:text-gray-300", children: "Daily Rate" }), _jsxs("span", { className: "font-semibold text-gray-900 dark:text-white", children: ["KES ", pricePerDay.toLocaleString()] })] }), days > 0 && (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-700 dark:text-gray-300", children: "Number of Days" }), _jsx("span", { className: "font-semibold text-gray-900 dark:text-white", children: days })] }))] }), totalPrice > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex justify-between text-lg font-bold mb-6", children: [_jsx("span", { className: "text-gray-900 dark:text-white", children: "Total Cost" }), _jsxs("span", { className: "text-primary", children: ["KES ", totalPrice.toLocaleString()] })] }), _jsxs("div", { className: "bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-xs text-blue-700 dark:text-blue-400 space-y-2", children: [_jsx("p", { children: _jsx("strong", { children: "Rental Period:" }) }), hireDate && _jsx("p", { children: new Date(hireDate).toLocaleDateString() }), returnDate && _jsxs("p", { children: ["to ", new Date(returnDate).toLocaleDateString()] })] })] })), totalPrice === 0 && (_jsx("p", { className: "text-gray-600 dark:text-gray-400 text-sm text-center py-4", children: "Select hire and return dates to see total cost" }))] }) })] })] }), _jsx(PaymentStatusModal, { isOpen: showPaymentModal, checkoutRequestId: checkoutRequestId, phone: phone, onClose: handlePaymentModalClose })] }));
}
//# sourceMappingURL=EquipmentCheckout.js.map