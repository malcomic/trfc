import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { getEventById } from '../api/events';
import { initiateTicketPayment } from '../api/payments';
import { AlertCircle, Loader } from 'lucide-react';
export default function EventCheckout() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors }, watch } = useForm({
        defaultValues: {
            quantity: 1,
            phone: '',
        },
    });
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const quantity = watch('quantity');
    const totalPrice = event ? Number(event.price) * Number(quantity) : 0;
    useEffect(() => {
        const fetchEvent = async () => {
            try {
                setLoading(true);
                if (!eventId) {
                    setError('Event ID not found');
                    return;
                }
                const data = await getEventById(eventId);
                setEvent(data);
            }
            catch (err) {
                console.error('Error fetching event:', err);
                setError(err.response?.data?.error || 'Failed to load event');
            }
            finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [eventId]);
    const onSubmit = async (data) => {
        try {
            setSubmitting(true);
            setError('');
            const paymentData = {
                phone: data.phone,
                amount: Math.round(totalPrice),
                ticketId: eventId,
            };
            const response = await initiateTicketPayment(paymentData);
            if (response.checkoutRequestId) {
                alert('M-Pesa prompt sent to your phone. Enter your PIN to complete payment.');
                navigate(`/ticket-confirmation/${response.checkoutRequestId}`, {
                    state: {
                        eventId,
                        quantity,
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
            console.error('Payment failed:', err);
            setError(err.response?.data?.error ||
                err.response?.data?.customerMessage ||
                'Payment initiation failed. Please try again.');
        }
        finally {
            setSubmitting(false);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "min-h-screen py-12 px-4 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx(Loader, { className: "w-12 h-12 animate-spin text-primary mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "Loading event..." })] }) }));
    }
    if (error && !event) {
        return (_jsx("div", { className: "min-h-screen py-12 px-4", children: _jsx("div", { className: "max-w-2xl mx-auto", children: _jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6 flex gap-4", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-red-800 mb-2", children: "Error" }), _jsx("p", { className: "text-red-700 mb-4", children: error }), _jsx("button", { onClick: () => navigate('/events'), className: "bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700", children: "Back to Events" })] })] }) }) }));
    }
    if (!event) {
        return (_jsx("div", { className: "min-h-screen py-12 px-4", children: _jsx("div", { className: "max-w-2xl mx-auto text-center", children: _jsx("p", { className: "text-gray-600", children: "Event not found" }) }) }));
    }
    return (_jsx("div", { className: "min-h-screen py-12 px-4 bg-gray-50", children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [_jsxs("div", { className: "mb-6", children: [_jsx("button", { onClick: () => navigate(`/events/${eventId}`), className: "text-primary hover:underline text-sm mb-4", children: "\u2190 Back to Event" }), _jsx("h1", { className: "text-3xl font-bold mb-2", children: "Buy Tickets" }), _jsx("p", { className: "text-gray-600", children: event.title })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsxs("div", { className: "md:col-span-2", children: [_jsxs("div", { className: "bg-white rounded-lg shadow p-6 mb-6", children: [_jsx("h2", { className: "text-xl font-bold mb-4", children: "Event Details" }), _jsxs("div", { className: "space-y-3 text-sm mb-6", children: [_jsxs("div", { children: [_jsx("p", { className: "text-gray-600", children: "Date & Time" }), _jsx("p", { className: "font-semibold", children: new Date(event.event_date).toLocaleDateString('en-US', {
                                                                weekday: 'long',
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            }) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-600", children: "Location" }), _jsx("p", { className: "font-semibold", children: event.location })] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-600", children: "Price per Ticket" }), _jsxs("p", { className: "font-semibold text-lg text-primary", children: ["KES ", Number(event.price).toFixed(2)] })] })] }), _jsx("p", { className: "text-sm text-gray-600", children: event.description })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "bg-white rounded-lg shadow p-6", children: [_jsx("h2", { className: "text-xl font-bold mb-4", children: "Your Information" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Number of Tickets" }), _jsx("select", { ...register('quantity', {
                                                                required: 'Quantity is required',
                                                                min: { value: 1, message: 'At least 1 ticket required' },
                                                                max: { value: 10, message: 'Maximum 10 tickets per order' },
                                                            }), className: "w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-primary", children: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (_jsxs("option", { value: num, children: [num, " ", num === 1 ? 'Ticket' : 'Tickets'] }, num))) }), errors.quantity && (_jsx("p", { className: "text-red-600 text-sm mt-1", children: errors.quantity.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Phone Number (254XXXXXXXXX)" }), _jsx("input", { ...register('phone', {
                                                                required: 'Phone number is required',
                                                                pattern: {
                                                                    value: /^254\d{9}$/,
                                                                    message: 'Phone must be in format 254XXXXXXXXX',
                                                                },
                                                            }), type: "text", placeholder: "254712345678", className: "w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-primary" }), errors.phone && (_jsx("p", { className: "text-red-600 text-sm mt-1", children: errors.phone.message }))] }), error && (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded p-3 flex gap-3", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 flex-shrink-0" }), _jsx("p", { className: "text-red-700 text-sm", children: error })] })), _jsx("button", { type: "submit", disabled: submitting, className: "w-full bg-primary text-white py-3 rounded-lg hover:bg-opacity-90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", children: submitting ? (_jsxs(_Fragment, { children: [_jsx(Loader, { className: "w-4 h-4 animate-spin" }), "Processing..."] })) : ('Complete Purchase') })] })] })] }), _jsx("div", { className: "md:col-span-1", children: _jsxs("div", { className: "bg-white rounded-lg shadow p-6 sticky top-4", children: [_jsx("h3", { className: "text-lg font-bold mb-4", children: "Order Summary" }), _jsxs("div", { className: "space-y-2 mb-4 pb-4 border-b", children: [_jsxs("div", { className: "flex justify-between text-sm", children: [_jsxs("span", { children: [quantity, " ticket(s)"] }), _jsxs("span", { className: "font-semibold", children: ["KES ", (Number(event.price) * Number(quantity)).toFixed(2)] })] }), _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { children: "Convenience Fee" }), _jsx("span", { children: "Free" })] })] }), _jsxs("div", { className: "flex justify-between text-lg font-bold mb-6", children: [_jsx("span", { children: "Total" }), _jsxs("span", { className: "text-primary", children: ["KES ", totalPrice.toFixed(2)] })] }), _jsx("p", { className: "text-xs text-gray-600 bg-gray-50 p-3 rounded", children: "\u2139\uFE0F After clicking \"Complete Purchase\", an M-Pesa prompt will appear on your phone. Enter your M-Pesa PIN to complete the payment." })] }) })] })] }) }));
}
//# sourceMappingURL=EventCheckout.js.map