import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Trash2, Plus, X, Edit } from 'lucide-react';
import { getGallery, uploadGalleryFile, uploadMedia, updateMedia, deleteMedia } from '../../api/admin/gallery';
import AdminConfirmDialog from '../../components/AdminConfirmDialog';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
function GalleryMedia({ item }) {
    if (item.media_type === 'video') {
        return (_jsx("video", { src: item.media_url, className: "w-full h-full object-cover", controls: true, onError: (e) => {
                e.target.style.display = 'none';
            } }));
    }
    return (_jsx("img", { src: item.media_url, alt: item.caption || 'Gallery item', className: "w-full h-full object-cover", onError: (e) => {
            e.target.src = 'https://via.placeholder.com/300x200?text=Invalid+URL';
        } }));
}
export default function AdminGallery() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [filePreview, setFilePreview] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const { register, handleSubmit, reset, setValue, watch } = useForm();
    const fileInput = watch('file');
    useEffect(() => {
        fetchGallery();
    }, []);
    useEffect(() => {
        if (fileInput && fileInput.length > 0) {
            const file = fileInput[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setFilePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
        else {
            setFilePreview(null);
        }
    }, [fileInput]);
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
            setUploading(true);
            setError('');
            if (editingId) {
                await updateMedia(editingId, {
                    caption: data.caption,
                    media_type: data.media_type,
                });
            }
            else {
                let mediaUrl = data.media_url;
                if (data.file && data.file.length > 0) {
                    const file = data.file[0];
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('media_type', data.media_type || 'image');
                    const result = await uploadGalleryFile(formData);
                    mediaUrl = result.url;
                }
                if (!mediaUrl) {
                    setError('Please provide either a file or URL');
                    setUploading(false);
                    return;
                }
                await uploadMedia({
                    media_url: mediaUrl,
                    media_type: data.media_type || 'image',
                    caption: data.caption,
                });
            }
            setShowModal(false);
            setEditingId(null);
            setFilePreview(null);
            reset();
            fetchGallery();
        }
        catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to process request');
        }
        finally {
            setUploading(false);
        }
    };
    const confirmDelete = async () => {
        if (!deleteId)
            return;
        try {
            await deleteMedia(deleteId);
            fetchGallery();
        }
        catch (err) {
            setError('Failed to delete media');
            console.error(err);
        }
        finally {
            setDeleteId(null);
        }
    };
    if (loading) {
        return _jsx("div", { className: "text-lg text-gray-600 dark:text-gray-400", children: "Loading gallery..." });
    }
    return (_jsxs("div", { children: [_jsx(AdminPageHeader, { title: "Gallery", actions: _jsxs("button", { onClick: () => {
                        setEditingId(null);
                        setFilePreview(null);
                        reset();
                        setShowModal(true);
                    }, className: "flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white px-6 py-2 rounded-lg hover:opacity-90 transition w-full sm:w-auto min-h-[44px]", children: [_jsx(Plus, { size: 20 }), "Upload Media"] }) }), error && (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6", children: error })), items.length === 0 ? (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-12 text-center", children: [_jsx("p", { className: "text-gray-600 dark:text-gray-400 text-lg", children: "No media in gallery yet" }), _jsx("button", { onClick: () => setShowModal(true), className: "mt-4 bg-primary dark:bg-primary-dark text-white px-6 py-2 rounded-lg hover:opacity-90", children: "Upload First Media" })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: items.map((item) => (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden hover:shadow-lg transition", children: [_jsxs("div", { className: "relative w-full h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden", children: [_jsx(GalleryMedia, { item: item }), _jsxs("div", { className: "absolute top-2 right-2 flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(item), className: "bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition", children: _jsx(Edit, { size: 16 }) }), _jsx("button", { onClick: () => setDeleteId(item.id), className: "bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition", children: _jsx(Trash2, { size: 16 }) })] })] }), _jsxs("div", { className: "p-4", children: [item.caption && (_jsx("p", { className: "text-sm text-gray-700 dark:text-gray-300 mb-2", children: item.caption })), _jsxs("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: [item.media_type || 'image', " \u2022 ", new Date(item.uploaded_at).toLocaleDateString()] })] })] }, item.id))) })), showModal && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[85vh] overflow-y-auto", children: [_jsxs("div", { className: "p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: editingId ? 'Edit Media' : 'Upload Media' }), _jsx("button", { onClick: () => {
                                        setShowModal(false);
                                        setEditingId(null);
                                        setFilePreview(null);
                                        reset();
                                    }, className: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200", children: _jsx(X, { size: 24 }) })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "p-4 sm:p-6 space-y-4", children: [!editingId && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Upload File" }), _jsx("input", { type: "file", accept: "image/*,video/*", ...register('file'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" }), filePreview && (_jsx("div", { className: "mt-2 relative w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden", children: _jsx("img", { src: filePreview, alt: "Preview", className: "w-full h-full object-cover" }) }))] }), _jsx("div", { className: "text-center text-gray-500 dark:text-gray-400 text-sm", children: "OR" }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Media URL" }), _jsx("input", { type: "url", ...register('media_url'), placeholder: "https://example.com/image.jpg", className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" })] })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Media Type" }), _jsxs("select", { ...register('media_type'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white", children: [_jsx("option", { value: "image", children: "Image" }), _jsx("option", { value: "video", children: "Video" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Caption" }), _jsx("textarea", { ...register('caption'), placeholder: "Optional caption for this media", className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white", rows: 3 })] }), _jsxs("div", { className: "flex gap-2 justify-end pt-4", children: [_jsx("button", { type: "button", onClick: () => {
                                                setShowModal(false);
                                                setEditingId(null);
                                                setFilePreview(null);
                                                reset();
                                            }, className: "px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700", children: "Cancel" }), _jsx("button", { type: "submit", disabled: uploading, className: "px-4 py-2 bg-primary dark:bg-primary-dark text-white rounded-lg hover:opacity-90 disabled:opacity-50", children: uploading ? 'Uploading...' : editingId ? 'Update' : 'Upload' })] })] })] }) })), _jsx(AdminConfirmDialog, { open: deleteId !== null, title: "Delete media", message: "Are you sure you want to delete this media item?", confirmLabel: "Delete", variant: "danger", onConfirm: confirmDelete, onCancel: () => setDeleteId(null) })] }));
}
//# sourceMappingURL=AdminGallery.js.map