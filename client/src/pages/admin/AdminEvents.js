import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { getEventsForAdmin, createEvent, updateEvent, deleteEvent } from '../../api/admin/events';
export default function AdminEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    useEffect(() => {
        fetchEvents();
    }, []);
    const fetchEvents = async () => {
        try {
            setLoading(true);
            const data = await getEventsForAdmin();
            setEvents(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError('Failed to fetch events');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const onSubmit = async (data) => {
        try {
            if (editingId) {
                await updateEvent(editingId, {
                    ...data,
                    price: parseFloat(data.price),
                    capacity: data.capacity ? parseInt(data.capacity) : null,
                    is_active: data.is_active === 'on',
                });
            }
            else {
                await createEvent({
                    ...data,
                    price: parseFloat(data.price),
                    capacity: data.capacity ? parseInt(data.capacity) : null,
                });
            }
            setShowModal(false);
            setEditingId(null);
            reset();
            fetchEvents();
        }
        catch (err) {
            setError(err.response?.data?.error || 'Failed to save event');
        }
    };
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            try {
                await deleteEvent(id);
                fetchEvents();
            }
            catch (err) {
                setError('Failed to delete event');
                console.error(err);
            }
        }
    };
    const handleEdit = (event) => {
        setEditingId(event.id);
        reset(event);
        setShowModal(true);
    };
    if (loading) {
        return _jsx("div", { className: "text-lg text-gray-600", children: "Loading events..." });
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-center mb-8", children: [_jsx("h1", { className: "text-4xl font-bold text-gray-800", children: "Manage Events" }), _jsxs("button", { onClick: () => {
                            setEditingId(null);
                            reset();
                            setShowModal(true);
                        }, className: "flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition", children: [_jsx(Plus, { size: 20 }), "New Event"] })] }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6", children: error })), _jsx("div", { className: "bg-white rounded-lg shadow-md overflow-hidden", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-100 border-b", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Title" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Date" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Price" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Actions" })] }) }), _jsx("tbody", { children: events.map((event) => (_jsxs("tr", { className: "border-b hover:bg-gray-50", children: [_jsx("td", { className: "px-6 py-4", children: event.title }), _jsx("td", { className: "px-6 py-4", children: new Date(event.event_date).toLocaleDateString() }), _jsxs("td", { className: "px-6 py-4", children: ["KES ", event.price] }), _jsx("td", { className: "px-6 py-4", children: _jsx("span", { className: `px-3 py-1 rounded-full text-sm font-semibold ${event.is_active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'}`, children: event.is_active ? 'Active' : 'Inactive' }) }), _jsxs("td", { className: "px-6 py-4 flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(event), className: "flex items-center gap-1 text-blue-600 hover:text-blue-800", children: _jsx(Edit2, { size: 18 }) }), _jsx("button", { onClick: () => handleDelete(event.id), className: "flex items-center gap-1 text-red-600 hover:text-red-800", children: _jsx(Trash2, { size: 18 }) })] })] }, event.id))) })] }) }), showModal && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto", children: [_jsx("div", { className: "p-6 border-b", children: _jsx("h2", { className: "text-2xl font-bold", children: editingId ? 'Edit Event' : 'New Event' }) }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1", children: "Title *" }), _jsx("input", { type: "text", ...register('title', { required: 'Title is required' }), className: "w-full border rounded-lg px-3 py-2" }), errors.title && _jsx("span", { className: "text-red-600 text-sm", children: errors.title.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1", children: "Date *" }), _jsx("input", { type: "datetime-local", ...register('event_date', { required: 'Date is required' }), className: "w-full border rounded-lg px-3 py-2" }), errors.event_date && _jsx("span", { className: "text-red-600 text-sm", children: errors.event_date.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1", children: "Price (KES) *" }), _jsx("input", { type: "number", step: "0.01", ...register('price', { required: 'Price is required' }), className: "w-full border rounded-lg px-3 py-2" }), errors.price && _jsx("span", { className: "text-red-600 text-sm", children: errors.price.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1", children: "Location" }), _jsx("input", { type: "text", ...register('location'), className: "w-full border rounded-lg px-3 py-2" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1", children: "Capacity" }), _jsx("input", { type: "number", ...register('capacity'), className: "w-full border rounded-lg px-3 py-2" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1", children: "Image URL" }), _jsx("input", { type: "url", ...register('image_url'), className: "w-full border rounded-lg px-3 py-2" })] }), editingId && (_jsx("div", { children: _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", ...register('is_active'), defaultChecked: events.find(e => e.id === editingId)?.is_active, className: "w-4 h-4" }), _jsx("span", { className: "text-sm font-semibold", children: "Active" })] }) })), _jsxs("div", { className: "flex gap-2 justify-end pt-4", children: [_jsx("button", { type: "button", onClick: () => {
                                                setShowModal(false);
                                                reset();
                                            }, className: "px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50", children: "Cancel" }), _jsx("button", { type: "submit", className: "px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90", children: editingId ? 'Update' : 'Create' })] })] })] }) }))] }));
}
//# sourceMappingURL=AdminEvents.js.map