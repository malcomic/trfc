import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getGallery } from '../api/gallery';
export default function Gallery() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    useEffect(() => {
        fetchGallery();
    }, []);
    const fetchGallery = async () => {
        try {
            setLoading(false);
            const data = await getGallery();
            setItems(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError('Failed to load gallery');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-light py-12 px-4", children: _jsx("div", { className: "max-w-6xl mx-auto", children: _jsx("p", { className: "text-center text-gray-600", children: "Loading gallery..." }) }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-light py-12 px-4", children: [_jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsx("h1", { className: "text-5xl font-bold text-center mb-4", children: "Gallery" }), _jsx("p", { className: "text-center text-gray-600 mb-12", children: "Moments from our community" }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6", children: error })), items.length === 0 ? (_jsx("div", { className: "bg-white rounded-lg shadow-md p-12 text-center", children: _jsx("p", { className: "text-gray-600 text-lg", children: "Gallery coming soon!" }) })) : (_jsx(_Fragment, { children: _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8", children: items.map((item) => (_jsxs("div", { className: "bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer", onClick: () => setSelectedItem(item), children: [_jsx("div", { className: "relative w-full h-64 bg-gray-100 overflow-hidden", children: _jsx("img", { src: item.media_url, alt: item.caption || 'Gallery item', className: "w-full h-full object-cover hover:scale-105 transition", onError: (e) => {
                                                e.target.src = 'https://via.placeholder.com/400x300?text=Invalid+URL';
                                            } }) }), item.caption && (_jsx("div", { className: "p-4", children: _jsx("p", { className: "text-gray-700", children: item.caption }) }))] }, item.id))) }) }))] }), selectedItem && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50", onClick: () => setSelectedItem(null), children: _jsxs("div", { className: "bg-white rounded-lg max-w-2xl w-full overflow-hidden", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "relative w-full h-96 bg-gray-100", children: _jsx("img", { src: selectedItem.media_url, alt: selectedItem.caption || 'Gallery item', className: "w-full h-full object-cover", onError: (e) => {
                                    e.target.src = 'https://via.placeholder.com/800x600?text=Invalid+URL';
                                } }) }), selectedItem.caption && (_jsxs("div", { className: "p-6", children: [_jsx("p", { className: "text-gray-700 text-lg mb-2", children: selectedItem.caption }), _jsx("p", { className: "text-xs text-gray-500", children: new Date(selectedItem.uploaded_at).toLocaleDateString() })] }))] }) }))] }));
}
//# sourceMappingURL=Gallery.js.map