import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { getProductsForAdmin, createProduct, updateProduct, deleteProduct } from '../../api/admin/products';
import AdminConfirmDialog from '../../components/AdminConfirmDialog';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard';
import AdminResponsiveData from '../../components/admin/AdminResponsiveData';
export default function AdminProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    useEffect(() => {
        fetchProducts();
    }, []);
    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await getProductsForAdmin();
            setProducts(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError('Failed to fetch products');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const onSubmit = async (data) => {
        try {
            if (editingId) {
                await updateProduct(editingId, {
                    ...data,
                    price: parseFloat(data.price),
                    stock: parseInt(data.stock),
                    is_active: data.is_active === 'on',
                });
            }
            else {
                await createProduct({
                    ...data,
                    price: parseFloat(data.price),
                    stock: parseInt(data.stock),
                });
            }
            setShowModal(false);
            setEditingId(null);
            reset();
            fetchProducts();
        }
        catch (err) {
            setError(err.response?.data?.error || 'Failed to save product');
        }
    };
    const confirmDelete = async () => {
        if (!deleteId)
            return;
        try {
            await deleteProduct(deleteId);
            fetchProducts();
        }
        catch (err) {
            setError('Failed to delete product');
            console.error(err);
        }
        finally {
            setDeleteId(null);
        }
    };
    const handleEdit = (product) => {
        setEditingId(product.id);
        reset(product);
        setShowModal(true);
    };
    if (loading) {
        return _jsx("div", { className: "text-lg text-gray-600 dark:text-gray-400", children: "Loading products..." });
    }
    return (_jsxs("div", { children: [_jsx(AdminPageHeader, { title: "Products", actions: _jsxs("button", { onClick: () => {
                        setEditingId(null);
                        reset();
                        setShowModal(true);
                    }, className: "flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white px-6 py-2 rounded-lg hover:opacity-90 transition w-full sm:w-auto", children: [_jsx(Plus, { size: 20 }), "New Product"] }) }), error && (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6", children: error })), _jsx(AdminResponsiveData, { isEmpty: products.length === 0, empty: _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400", children: "No products yet" }), desktop: _jsxs("table", { className: "w-full min-w-[640px]", children: [_jsx("thead", { className: "bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Name" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Category" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Price" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Stock" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Actions" })] }) }), _jsx("tbody", { children: products.map((product) => (_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100", children: [_jsx("td", { className: "px-6 py-4", children: product.name }), _jsx("td", { className: "px-6 py-4", children: product.category }), _jsxs("td", { className: "px-6 py-4", children: ["KES ", (Number(product.price) || 0).toFixed(2)] }), _jsx("td", { className: "px-6 py-4", children: product.stock }), _jsx("td", { className: "px-6 py-4", children: _jsx("span", { className: `px-3 py-1 rounded-full text-sm font-semibold ${product.is_active
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`, children: product.is_active ? 'Active' : 'Inactive' }) }), _jsxs("td", { className: "px-6 py-4 flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(product), className: "flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px]", children: _jsx(Edit2, { size: 18 }) }), _jsx("button", { onClick: () => setDeleteId(product.id), className: "flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px]", children: _jsx(Trash2, { size: 18 }) })] })] }, product.id))) })] }), mobile: products.map((product) => (_jsxs(AdminMobileCard, { footer: _jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => handleEdit(product), className: "flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px] px-3", children: [_jsx(Edit2, { size: 18 }), " Edit"] }), _jsxs("button", { onClick: () => setDeleteId(product.id), className: "flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px] px-3", children: [_jsx(Trash2, { size: 18 }), " Delete"] })] }), children: [_jsx("p", { className: "font-semibold text-gray-900 dark:text-white", children: product.name }), _jsx(AdminMobileCardRow, { label: "Category", value: product.category }), _jsx(AdminMobileCardRow, { label: "Price", value: `KES ${(Number(product.price) || 0).toFixed(2)}` }), _jsx(AdminMobileCardRow, { label: "Stock", value: product.stock }), _jsx(AdminMobileCardRow, { label: "Status", value: _jsx("span", { className: `px-2 py-0.5 rounded-full text-xs font-semibold ${product.is_active
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`, children: product.is_active ? 'Active' : 'Inactive' }) })] }, product.id))) }), showModal && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[85vh] overflow-y-auto", children: [_jsx("div", { className: "p-6 border-b border-gray-200 dark:border-gray-700", children: _jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: editingId ? 'Edit Product' : 'New Product' }) }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Name *" }), _jsx("input", { type: "text", ...register('name', { required: 'Name is required' }), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" }), errors.name && _jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: errors.name.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Category *" }), _jsx("input", { type: "text", ...register('category', { required: 'Category is required' }), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" }), errors.category && _jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: errors.category.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Price (KES) *" }), _jsx("input", { type: "number", step: "0.01", ...register('price', { required: 'Price is required' }), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" }), errors.price && _jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: errors.price.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Stock *" }), _jsx("input", { type: "number", ...register('stock', { required: 'Stock is required' }), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" }), errors.stock && _jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: errors.stock.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Description" }), _jsx("textarea", { ...register('description'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white", rows: 2 })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Image URL" }), _jsx("input", { type: "url", ...register('image_url'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" })] }), editingId && (_jsx("div", { children: _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", ...register('is_active'), defaultChecked: products.find(p => p.id === editingId)?.is_active, className: "w-4 h-4" }), _jsx("span", { className: "text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Active" })] }) })), _jsxs("div", { className: "flex gap-2 justify-end pt-4", children: [_jsx("button", { type: "button", onClick: () => {
                                                setShowModal(false);
                                                reset();
                                            }, className: "px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700", children: "Cancel" }), _jsx("button", { type: "submit", className: "px-4 py-2 bg-primary dark:bg-primary-dark text-white rounded-lg hover:opacity-90", children: editingId ? 'Update' : 'Create' })] })] })] }) })), _jsx(AdminConfirmDialog, { open: deleteId !== null, title: "Delete product", message: "Are you sure you want to delete this product? This action cannot be undone.", confirmLabel: "Delete", variant: "danger", onConfirm: confirmDelete, onCancel: () => setDeleteId(null) })] }));
}
//# sourceMappingURL=AdminProducts.js.map