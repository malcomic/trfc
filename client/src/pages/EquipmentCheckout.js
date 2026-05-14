import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { createEquipmentHireRequest, initiateEquipmentPayment } from '../api/equipment';
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
            // Create hire request first
            const hireRequest = await createEquipmentHireRequest({
                equipmentName: data.equipmentName,
                packageType: packageType,
                hireDate: data.hireDate,
                returnDate: data.returnDate,
            });
            // Initiate payment
            const paymentResponse = await initiateEquipmentPayment({
                phone: data.phone,
                amount: Math.round(totalPrice),
                equipmentHireId: hireRequest.id,
            });
            if (paymentResponse.checkoutRequestId) {
                alert('M-Pesa prompt sent to your phone. Enter your PIN to complete payment.');
                navigate(`/hire-confirmation/${paymentResponse.checkoutRequestId}`, {
                    state: {
                        hireId: hireRequest.id,
                        equipmentName: data.equipmentName,
                        hireDate: data.hireDate,
                        returnDate: data.returnDate,
                        totalPrice,
                        phone: data.phone,
                    },
                });
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
    return (_jsx("div", { className: "min-h-screen py-12 px-4 bg-gray-50", children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [_jsxs("div", { className: "mb-6", children: [_jsx("button", { onClick: () => navigate('/equipment'), className: "text-primary hover:underline text-sm mb-4", children: "\u2190 Back to Equipment" }), _jsx("h1", { className: "text-3xl font-bold mb-2", children: "Book Equipment" }), _jsxs("p", { className: "text-gray-600 capitalize", children: [packageType, " Rental Package - KES ", pricePerDay, "/day"] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsx("form", { onSubmit: handleSubmit(onSubmit), className: "md:col-span-2", children: _jsxs("div", { className: "bg-white rounded-lg shadow p-6 space-y-4", children: [_jsx("h2", { className: "text-xl font-bold mb-4", children: "Booking Details" }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Equipment Name" }), _jsx("input", { ...register('equipmentName', {
                                                    required: 'Equipment name is required',
                                                }), type: "text", placeholder: "e.g., Dumbbells, Treadmill", className: "w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-primary" }), errors.equipmentName && (_jsx("p", { className: "text-red-600 text-sm mt-1", children: errors.equipmentName.message }))] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Hire Date" }), _jsxs("div", { className: "relative", children: [_jsx(Calendar, { className: "absolute left-3 top-3 w-4 h-4 text-gray-400" }), _jsx("input", { ...register('hireDate', {
                                                                    required: 'Hire date is required',
                                                                }), type: "date", min: today, className: "w-full border border-gray-300 rounded px-4 py-2 pl-10 focus:outline-none focus:border-primary" })] }), errors.hireDate && (_jsx("p", { className: "text-red-600 text-sm mt-1", children: errors.hireDate.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Return Date" }), _jsxs("div", { className: "relative", children: [_jsx(Calendar, { className: "absolute left-3 top-3 w-4 h-4 text-gray-400" }), _jsx("input", { ...register('returnDate', {
                                                                    required: 'Return date is required',
                                                                }), type: "date", min: hireDate || today, className: "w-full border border-gray-300 rounded px-4 py-2 pl-10 focus:outline-none focus:border-primary" })] }), errors.returnDate && (_jsx("p", { className: "text-red-600 text-sm mt-1", children: errors.returnDate.message }))] })] }), _jsx("h2", { className: "text-xl font-bold mt-6 mb-4", children: "Payment Details" }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Phone Number (254XXXXXXXXX)" }), _jsx("input", { ...register('phone', {
                                                    required: 'Phone number is required',
                                                    pattern: {
                                                        value: /^254\d{9}$/,
                                                        message: 'Phone must be in format 254XXXXXXXXX',
                                                    },
                                                }), type: "text", placeholder: "254712345678", className: "w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-primary" }), errors.phone && (_jsx("p", { className: "text-red-600 text-sm mt-1", children: errors.phone.message }))] }), error && (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded p-4 flex gap-3", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" }), _jsx("p", { className: "text-red-700 text-sm", children: error })] })), _jsx("button", { type: "submit", disabled: loading || totalPrice === 0, className: "w-full bg-primary text-white py-3 rounded-lg hover:bg-opacity-90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader, { className: "w-4 h-4 animate-spin" }), "Processing..."] })) : ('Proceed to Payment') })] }) }), _jsx("div", { className: "md:col-span-1", children: _jsxs("div", { className: "bg-white rounded-lg shadow p-6 sticky top-4", children: [_jsx("h3", { className: "text-lg font-bold mb-4", children: "Booking Summary" }), _jsxs("div", { className: "space-y-2 mb-4 pb-4 border-b", children: [_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { children: "Package Type" }), _jsx("span", { className: "font-semibold capitalize", children: packageType })] }), _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { children: "Daily Rate" }), _jsxs("span", { className: "font-semibold", children: ["KES ", pricePerDay.toLocaleString()] })] }), days > 0 && (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { children: "Number of Days" }), _jsx("span", { className: "font-semibold", children: days })] }))] }), totalPrice > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex justify-between text-lg font-bold mb-6", children: [_jsx("span", { children: "Total Cost" }), _jsxs("span", { className: "text-primary", children: ["KES ", totalPrice.toLocaleString()] })] }), _jsxs("div", { className: "bg-blue-50 p-3 rounded text-xs text-blue-700 space-y-2", children: [_jsx("p", { children: _jsx("strong", { children: "Rental Period:" }) }), hireDate && _jsx("p", { children: new Date(hireDate).toLocaleDateString() }), returnDate && _jsxs("p", { children: ["to ", new Date(returnDate).toLocaleDateString()] })] })] })), totalPrice === 0 && (_jsx("p", { className: "text-gray-600 text-sm text-center py-4", children: "Select hire and return dates to see total cost" }))] }) })] })] }) }));
}
//# sourceMappingURL=EquipmentCheckout.js.map