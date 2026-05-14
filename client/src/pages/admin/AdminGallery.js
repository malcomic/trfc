import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Trash2, Plus, X, Edit } from 'lucide-react';
import { getGallery, uploadMedia, updateMedia, deleteMedia } from '../../api/admin/gallery';
export default function AdminGallery() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm();
    useEffect(() => {
        fetchGallery();
    }, []);
    const fetchGallery = async () => {
        try {
            setLoading(true);
            const data = await getGallery();
            setItems(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError('Failed to fetch gallery');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleEdit = (item) => {
        setEditingId(item.id);
        setValue('caption', item.caption || '');
        setValue('media_type', item.media_type || 'image');
        setShowModal(true);
    };
    const onSubmit = async (data) => {
        try {
            if (editingId) {
                await updateMedia(editingId, {
                    caption: data.caption,
                    media_type: data.media_type,
                });
            }
            else {
                await uploadMedia({
                    media_url: data.media_url,
                    media_type: data.media_type || 'image',
                    caption: data.caption,
                });
            }
            setShowModal(false);
            setEditingId(null);
            reset();
            fetchGallery();
        }
        catch (err) {
            setError(err.response?.data?.error || 'Failed to process request');
        }
    };
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this media?')) {
            try {
                await deleteMedia(id);
                fetchGallery();
            }
            catch (err) {
                setError('Failed to delete media');
                console.error(err);
            }
        }
    };
    if (loading) {
        return _jsx("div", { className: "text-lg text-gray-600", children: "Loading gallery..." });
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-center mb-8", children: [_jsx("h1", { className: "text-4xl font-bold text-gray-800", children: "Gallery Manager" }), _jsxs("button", { onClick: () => {
                            setEditingId(null);
                            reset();
                            setShowModal(true);
                        }, className: "flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition", children: [_jsx(Plus, { size: 20 }), "Upload Media"] })] }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6", children: error })), items.length === 0 ? (_jsxs("div", { className: "bg-white rounded-lg shadow-md p-12 text-center", children: [_jsx("p", { className: "text-gray-600 text-lg", children: "No media in gallery yet" }), _jsx("button", { onClick: () => setShowModal(true), className: "mt-4 bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90", children: "Upload First Media" })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: items.map((item) => (_jsxs("div", { className: "bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition", children: [_jsxs("div", { className: "relative w-full h-48 bg-gray-100 overflow-hidden", children: [_jsx("img", { src: item.media_url, alt: item.caption || 'Gallery item', className: "w-full h-full object-cover", onError: (e) => {
                                        e.target.src = 'https://via.placeholder.com/300x200?text=Invalid+URL';
                                    } }), _jsxs("div", { className: "absolute top-2 right-2 flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(item), className: "bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition", children: _jsx(Edit, { size: 16 }) }), _jsx("button", { onClick: () => handleDelete(item.id), className: "bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition", children: _jsx(Trash2, { size: 16 }) })] })] }), _jsxs("div", { className: "p-4", children: [item.caption && (_jsx("p", { className: "text-sm text-gray-700 mb-2", children: item.caption })), _jsxs("p", { className: "text-xs text-gray-500", children: [item.media_type || 'image', " \u2022 ", new Date(item.uploaded_at).toLocaleDateString()] })] })] }, item.id))) })), showModal && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-lg max-w-md w-full", children: [_jsxs("div", { className: "p-6 border-b flex justify-between items-center", children: [_jsx("h2", { className: "text-2xl font-bold", children: editingId ? 'Edit Media' : 'Upload Media' }), _jsx("button", { onClick: () => {
                                        setShowModal(false);
                                        setEditingId(null);
                                        reset();
                                    }, className: "text-gray-500 hover:text-gray-700", children: _jsx(X, { size: 24 }) })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "p-6 space-y-4", children: [!editingId && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1", children: "Media URL *" }), _jsx("input", { type: "url", ...register('media_url', { required: !editingId ? 'Media URL is required' : false }), placeholder: "https://example.com/image.jpg", className: "w-full border rounded-lg px-3 py-2" }), errors.media_url && _jsx("span", { className: "text-red-600 text-sm", children: errors.media_url.message })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1", children: "Media Type" }), _jsxs("select", { ...register('media_type'), className: "w-full border rounded-lg px-3 py-2", children: [_jsx("option", { value: "image", children: "Image" }), _jsx("option", { value: "video", children: "Video" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1", children: "Caption" }), _jsx("textarea", { ...register('caption'), placeholder: "Optional caption for this media", className: "w-full border rounded-lg px-3 py-2", rows: 3 })] }), _jsxs("div", { className: "flex gap-2 justify-end pt-4", children: [_jsx("button", { type: "button", onClick: () => {
                                                setShowModal(false);
                                                setEditingId(null);
                                                reset();
                                            }, className: "px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50", children: "Cancel" }), _jsx("button", { type: "submit", className: "px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90", children: editingId ? 'Update' : 'Upload' })] })] })] }) }))] }));
}
//# sourceMappingURL=AdminGallery.js.map