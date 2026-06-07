import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Trash2, Edit2, Plus, X } from 'lucide-react';
import { getSponsorshipTiersForAdmin, createSponsorshipTier, updateSponsorshipTier, deleteSponsorshipTier, } from '../../api/admin/sponsorshipTiers';
import { SPONSORSHIP_ICON_OPTIONS, getSponsorshipIcon } from '../../utils/sponsorshipIcons';
import AdminConfirmDialog from '../../components/AdminConfirmDialog';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard';
import AdminResponsiveData from '../../components/admin/AdminResponsiveData';
export default function AdminSponsorshipTiers() {
    const [tiers, setTiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [benefits, setBenefits] = useState(['']);
    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    useEffect(() => {
        fetchTiers();
    }, []);
    const fetchTiers = async () => {
        try {
            setLoading(true);
            const data = await getSponsorshipTiersForAdmin();
            setTiers(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError('Failed to fetch sponsorship tiers');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const openCreateModal = () => {
        setEditingId(null);
        setBenefits(['']);
        reset({
            slug: '',
            name: '',
            price_display: '',
            icon: 'Handshake',
            sort_order: tiers.length + 1,
            is_active: true,
        });
        setShowModal(true);
    };
    const handleEdit = (tier) => {
        setEditingId(tier.id);
        setBenefits(tier.benefits.length > 0 ? [...tier.benefits] : ['']);
        reset({
            slug: tier.slug,
            name: tier.name,
            price_display: tier.price_display,
            icon: tier.icon,
            sort_order: tier.sort_order,
            is_active: tier.is_active,
        });
        setShowModal(true);
    };
    const addBenefit = () => setBenefits((prev) => [...prev, '']);
    const removeBenefit = (index) => {
        setBenefits((prev) => (prev.length <= 1 ? [''] : prev.filter((_, i) => i !== index)));
    };
    const updateBenefit = (index, value) => {
        setBenefits((prev) => prev.map((b, i) => (i === index ? value : b)));
    };
    const onSubmit = async (data) => {
        const normalizedBenefits = benefits.map((b) => b.trim()).filter(Boolean);
        if (normalizedBenefits.length === 0) {
            setError('At least one benefit is required');
            return;
        }
        try {
            setSaving(true);
            setError('');
            const payload = {
                slug: String(data.slug || '').trim(),
                name: String(data.name || '').trim(),
                price_display: String(data.price_display || '').trim(),
                benefits: normalizedBenefits,
                icon: String(data.icon || 'Handshake'),
                sort_order: parseInt(String(data.sort_order || '0'), 10) || 0,
            };
            if (editingId) {
                await updateSponsorshipTier(editingId, {
                    ...payload,
                    is_active: data.is_active === 'on' || data.is_active === true,
                });
            }
            else {
                await createSponsorshipTier(payload);
            }
            setShowModal(false);
            setEditingId(null);
            reset();
            setBenefits(['']);
            fetchTiers();
        }
        catch (err) {
            setError(err.response?.data?.error || 'Failed to save sponsorship tier');
        }
        finally {
            setSaving(false);
        }
    };
    const confirmDelete = async () => {
        if (!deleteId)
            return;
        try {
            await deleteSponsorshipTier(deleteId);
            fetchTiers();
        }
        catch (err) {
            setError(err.response?.data?.error || 'Failed to delete sponsorship tier');
            console.error(err);
        }
        finally {
            setDeleteId(null);
        }
    };
    if (loading) {
        return _jsx("div", { className: "text-lg text-gray-600 dark:text-gray-400", children: "Loading sponsorship tiers..." });
    }
    return (_jsxs("div", { children: [_jsx(AdminPageHeader, { title: "Sponsorship Tiers", actions: _jsxs("button", { onClick: openCreateModal, className: "flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white px-6 py-2 rounded-lg hover:opacity-90 transition w-full sm:w-auto", children: [_jsx(Plus, { size: 20 }), "New Tier"] }) }), error && (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6", children: error })), _jsx(AdminResponsiveData, { isEmpty: tiers.length === 0, empty: _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400", children: "No sponsorship tiers yet" }), desktop: _jsxs("table", { className: "w-full min-w-[720px]", children: [_jsx("thead", { className: "bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Name" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Slug" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Price" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Benefits" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Order" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Actions" })] }) }), _jsx("tbody", { children: tiers.map((tier) => {
                                const Icon = getSponsorshipIcon(tier.icon);
                                return (_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100", children: [_jsx("td", { className: "px-6 py-4", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Icon, { size: 18, className: "text-primary dark:text-primary-dark shrink-0" }), tier.name] }) }), _jsx("td", { className: "px-6 py-4 font-mono text-sm", children: tier.slug }), _jsx("td", { className: "px-6 py-4", children: tier.price_display }), _jsxs("td", { className: "px-6 py-4 text-sm text-gray-600 dark:text-gray-400", children: [tier.benefits.length, " listed"] }), _jsx("td", { className: "px-6 py-4", children: tier.sort_order }), _jsx("td", { className: "px-6 py-4", children: _jsx("span", { className: `px-3 py-1 rounded-full text-sm font-semibold ${tier.is_active
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`, children: tier.is_active ? 'Active' : 'Inactive' }) }), _jsxs("td", { className: "px-6 py-4 flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(tier), className: "flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px]", children: _jsx(Edit2, { size: 18 }) }), _jsx("button", { onClick: () => setDeleteId(tier.id), className: "flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px]", children: _jsx(Trash2, { size: 18 }) })] })] }, tier.id));
                            }) })] }), mobile: tiers.map((tier) => {
                    const Icon = getSponsorshipIcon(tier.icon);
                    return (_jsxs(AdminMobileCard, { footer: _jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => handleEdit(tier), className: "flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px] px-3", children: [_jsx(Edit2, { size: 18 }), " Edit"] }), _jsxs("button", { onClick: () => setDeleteId(tier.id), className: "flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px] px-3", children: [_jsx(Trash2, { size: 18 }), " Delete"] })] }), children: [_jsxs("div", { className: "flex items-center gap-2 font-semibold text-gray-900 dark:text-white", children: [_jsx(Icon, { size: 18, className: "text-primary dark:text-primary-dark" }), tier.name] }), _jsx(AdminMobileCardRow, { label: "Slug", value: tier.slug }), _jsx(AdminMobileCardRow, { label: "Price", value: tier.price_display }), _jsx(AdminMobileCardRow, { label: "Benefits", value: `${tier.benefits.length} listed` }), _jsx(AdminMobileCardRow, { label: "Order", value: tier.sort_order }), _jsx(AdminMobileCardRow, { label: "Status", value: _jsx("span", { className: `px-2 py-0.5 rounded-full text-xs font-semibold ${tier.is_active
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`, children: tier.is_active ? 'Active' : 'Inactive' }) })] }, tier.id));
                }) }), showModal && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto", children: [_jsx("div", { className: "p-6 border-b border-gray-200 dark:border-gray-700", children: _jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: editingId ? 'Edit Sponsorship Tier' : 'New Sponsorship Tier' }) }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Name *" }), _jsx("input", { type: "text", ...register('name', { required: 'Name is required' }), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" }), errors.name && _jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: errors.name.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Slug *" }), _jsx("input", { type: "text", ...register('slug', { required: 'Slug is required' }), placeholder: "e.g. community-partner", className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm" }), _jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1", children: "Lowercase letters, numbers, and hyphens only" }), errors.slug && _jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: errors.slug.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Price Display *" }), _jsx("input", { type: "text", ...register('price_display', { required: 'Price is required' }), placeholder: "KES 50,000", className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" }), errors.price_display && _jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: errors.price_display.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Icon" }), _jsx("select", { ...register('icon'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white", children: SPONSORSHIP_ICON_OPTIONS.map((icon) => (_jsx("option", { value: icon, children: icon }, icon))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Sort Order" }), _jsx("input", { type: "number", ...register('sort_order'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("label", { className: "block text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Benefits *" }), _jsx("button", { type: "button", onClick: addBenefit, className: "text-sm text-primary dark:text-primary-dark font-semibold hover:underline", children: "+ Add benefit" })] }), _jsx("div", { className: "space-y-2", children: benefits.map((benefit, index) => (_jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", value: benefit, onChange: (e) => updateBenefit(index, e.target.value), placeholder: "Benefit description", className: "flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" }), _jsx("button", { type: "button", onClick: () => removeBenefit(index), className: "p-2 text-gray-500 hover:text-red-500", "aria-label": "Remove benefit", children: _jsx(X, { size: 18 }) })] }, index))) })] }), editingId && (_jsx("div", { children: _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", ...register('is_active'), defaultChecked: tiers.find((t) => t.id === editingId)?.is_active, className: "w-4 h-4" }), _jsx("span", { className: "text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Active (visible on public page)" })] }) })), _jsxs("div", { className: "flex gap-2 justify-end pt-4", children: [_jsx("button", { type: "button", onClick: () => {
                                                setShowModal(false);
                                                reset();
                                                setBenefits(['']);
                                            }, className: "px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700", children: "Cancel" }), _jsx("button", { type: "submit", disabled: saving, className: "px-4 py-2 bg-primary dark:bg-primary-dark text-white rounded-lg hover:opacity-90 disabled:opacity-50", children: saving ? 'Saving...' : editingId ? 'Update' : 'Create' })] })] })] }) })), _jsx(AdminConfirmDialog, { open: deleteId !== null, title: "Delete sponsorship tier", message: "Are you sure you want to delete this tier? Tiers with existing inquiries cannot be deleted.", confirmLabel: "Delete", variant: "danger", onConfirm: confirmDelete, onCancel: () => setDeleteId(null) })] }));
}
//# sourceMappingURL=AdminSponsorshipTiers.js.map