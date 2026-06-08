import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { getEventsForAdmin, createEvent, updateEvent, deleteEvent } from '../../api/admin/events';
import { uploadImage } from '../../api/admin/upload';
import AdminConfirmDialog from '../../components/AdminConfirmDialog';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard';
import AdminResponsiveData from '../../components/admin/AdminResponsiveData';
export default function AdminEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [filePreview, setFilePreview] = useState(null);
    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
    const fileInput = watch('file');
    useEffect(() => {
        fetchEvents();
    }, []);
    useEffect(() => {
        if (fileInput && fileInput.length > 0) {
            const file = fileInput[0];
            const reader = new FileReader();
            reader.onloadend = () => setFilePreview(reader.result);
            reader.readAsDataURL(file);
        }
        else {
            setFilePreview(null);
        }
    }, [fileInput]);
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
            setUploading(true);
            setError('');
            let imageUrl = data.image_url || undefined;
            if (data.file && data.file.length > 0) {
                const formData = new FormData();
                formData.append('file', data.file[0]);
                formData.append('folder', 'trfc_events');
                const result = await uploadImage(formData);
                imageUrl = result.url;
            }
            const payload = {
                title: data.title,
                description: data.description,
                event_date: data.event_date,
                location: data.location,
                price: parseFloat(data.price),
                capacity: data.capacity ? parseInt(data.capacity) : undefined,
                image_url: imageUrl,
            };
            if (editingId) {
                await updateEvent(editingId, {
                    ...payload,
                    is_active: data.is_active === 'on',
                });
            }
            else {
                await createEvent(payload);
            }
            setShowModal(false);
            setEditingId(null);
            setFilePreview(null);
            reset();
            fetchEvents();
        }
        catch (err) {
            setError(err.response?.data?.error || 'Failed to save event');
        }
        finally {
            setUploading(false);
        }
    };
    const confirmDelete = async () => {
        if (!deleteId)
            return;
        try {
            await deleteEvent(deleteId);
            fetchEvents();
        }
        catch (err) {
            setError('Failed to delete event');
            console.error(err);
        }
        finally {
            setDeleteId(null);
        }
    };
    const handleEdit = (event) => {
        setEditingId(event.id);
        setFilePreview(null);
        reset(event);
        setShowModal(true);
    };
    if (loading) {
        return _jsx("div", { className: "text-lg text-gray-600 dark:text-gray-400", children: "Loading events..." });
    }
    return (_jsxs("div", { children: [_jsx(AdminPageHeader, { title: "Events", actions: _jsxs("button", { onClick: () => {
                        setEditingId(null);
                        setFilePreview(null);
                        reset();
                        setShowModal(true);
                    }, className: "flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white dark:text-black px-6 py-2 rounded-lg hover:opacity-90 transition w-full sm:w-auto", children: [_jsx(Plus, { size: 20 }), "New Event"] }) }), error && (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6", children: error })), _jsx(AdminResponsiveData, { isEmpty: events.length === 0, empty: _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400", children: "No events yet" }), desktop: _jsxs("table", { className: "w-full min-w-[600px]", children: [_jsx("thead", { className: "bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Title" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Date" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Location" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Price" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Actions" })] }) }), _jsx("tbody", { children: events.map((event) => (_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100", children: [_jsx("td", { className: "px-6 py-4", children: event.title }), _jsx("td", { className: "px-6 py-4", children: new Date(event.event_date).toLocaleDateString() }), _jsx("td", { className: "px-6 py-4", children: event.location || '—' }), _jsxs("td", { className: "px-6 py-4", children: ["KES ", event.price] }), _jsx("td", { className: "px-6 py-4", children: _jsx("span", { className: `px-3 py-1 rounded-full text-sm font-semibold ${event.is_active
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`, children: event.is_active ? 'Active' : 'Inactive' }) }), _jsxs("td", { className: "px-6 py-4 flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(event), className: "flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 min-h-[44px]", children: _jsx(Edit2, { size: 18 }) }), _jsx("button", { onClick: () => setDeleteId(event.id), className: "flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 min-h-[44px]", children: _jsx(Trash2, { size: 18 }) })] })] }, event.id))) })] }), mobile: events.map((event) => (_jsxs(AdminMobileCard, { footer: _jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => handleEdit(event), className: "flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px] px-3", children: [_jsx(Edit2, { size: 18 }), " Edit"] }), _jsxs("button", { onClick: () => setDeleteId(event.id), className: "flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px] px-3", children: [_jsx(Trash2, { size: 18 }), " Delete"] })] }), children: [_jsx("p", { className: "font-semibold text-gray-900 dark:text-white", children: event.title }), _jsx(AdminMobileCardRow, { label: "Date", value: new Date(event.event_date).toLocaleDateString() }), _jsx(AdminMobileCardRow, { label: "Location", value: event.location || '—' }), _jsx(AdminMobileCardRow, { label: "Price", value: `KES ${event.price}` }), _jsx(AdminMobileCardRow, { label: "Status", value: _jsx("span", { className: `px-2 py-0.5 rounded-full text-xs font-semibold ${event.is_active
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`, children: event.is_active ? 'Active' : 'Inactive' }) })] }, event.id))) }), showModal && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[85vh] overflow-y-auto", children: [_jsx("div", { className: "p-6 border-b border-gray-200 dark:border-gray-700", children: _jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: editingId ? 'Edit Event' : 'New Event' }) }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Title *" }), _jsx("input", { type: "text", ...register('title', { required: 'Title is required' }), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" }), errors.title && _jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: errors.title.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Description" }), _jsx("textarea", { ...register('description'), rows: 3, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Date *" }), _jsx("input", { type: "datetime-local", ...register('event_date', { required: 'Date is required' }), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" }), errors.event_date && _jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: errors.event_date.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Price (KES) *" }), _jsx("input", { type: "number", step: "0.01", ...register('price', { required: 'Price is required' }), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" }), errors.price && _jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: errors.price.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Location" }), _jsx("input", { type: "text", ...register('location'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Capacity" }), _jsx("input", { type: "number", ...register('capacity'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Upload Image" }), _jsx("input", { type: "file", accept: "image/*", ...register('file'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" }), filePreview && (_jsx("div", { className: "mt-2 relative w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden", children: _jsx("img", { src: filePreview, alt: "Preview", className: "w-full h-full object-cover" }) })), !filePreview && editingId && watch('image_url') && (_jsx("div", { className: "mt-2 relative w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden", children: _jsx("img", { src: watch('image_url'), alt: "Current", className: "w-full h-full object-cover" }) }))] }), _jsx("div", { className: "text-center text-gray-500 dark:text-gray-400 text-sm", children: "OR" }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Image URL" }), _jsx("input", { type: "url", ...register('image_url'), placeholder: "https://example.com/image.jpg", className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" })] })] }), editingId && (_jsx("div", { children: _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", ...register('is_active'), defaultChecked: events.find(e => e.id === editingId)?.is_active, className: "w-4 h-4" }), _jsx("span", { className: "text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Active" })] }) })), _jsxs("div", { className: "flex gap-2 justify-end pt-4", children: [_jsx("button", { type: "button", onClick: () => {
                                                setShowModal(false);
                                                setFilePreview(null);
                                                reset();
                                            }, className: "px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700", children: "Cancel" }), _jsx("button", { type: "submit", disabled: uploading, className: "px-4 py-2 bg-primary dark:bg-primary-dark text-white dark:text-black rounded-lg hover:opacity-90 disabled:opacity-50", children: uploading ? 'Saving...' : editingId ? 'Update' : 'Create' })] })] })] }) })), _jsx(AdminConfirmDialog, { open: deleteId !== null, title: "Delete event", message: "Are you sure you want to delete this event? This action cannot be undone.", confirmLabel: "Delete", variant: "danger", onConfirm: confirmDelete, onCancel: () => setDeleteId(null) })] }));
}
//# sourceMappingURL=AdminEvents.js.map