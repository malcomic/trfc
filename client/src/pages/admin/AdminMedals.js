import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { getAdminMedals, updateAdminMedalTier, upsertAdminMedalOption, deleteAdminMedalOption, getAdminMedalPurchases, } from '../../api/admin/medals';
import { uploadImage } from '../../api/admin/upload';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard';
import AdminResponsiveData from '../../components/admin/AdminResponsiveData';
import AdminConfirmDialog from '../../components/AdminConfirmDialog';
export default function AdminMedals() {
    const [tiers, setTiers] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('tiers');
    const [editingTier, setEditingTier] = useState(null);
    const [tierForm, setTierForm] = useState({
        name: '',
        description: '',
        benefits: [''],
        image_url: '',
        sort_order: 0,
        is_active: true,
    });
    const [imageFile, setImageFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [saving, setSaving] = useState(false);
    const [optionTierId, setOptionTierId] = useState(null);
    const [editingOption, setEditingOption] = useState(null);
    const [optionForm, setOptionForm] = useState({
        distance_km: 10,
        price: 0,
        capacity: '',
        is_active: true,
    });
    const [deleteOption, setDeleteOption] = useState(null);
    useEffect(() => {
        fetchAll();
    }, []);
    const fetchAll = async () => {
        try {
            setLoading(true);
            const [tierData, purchaseData] = await Promise.all([
                getAdminMedals(),
                getAdminMedalPurchases(),
            ]);
            setTiers(Array.isArray(tierData) ? tierData : []);
            setPurchases(Array.isArray(purchaseData) ? purchaseData : []);
        }
        catch (err) {
            setError('Failed to load medals');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const openEditTier = (tier) => {
        setEditingTier(tier);
        setImageFile(null);
        setFilePreview(null);
        setTierForm({
            name: tier.name,
            description: tier.description || '',
            benefits: tier.benefits?.length ? [...tier.benefits] : [''],
            image_url: tier.image_url || '',
            sort_order: tier.sort_order,
            is_active: tier.is_active,
        });
    };
    const closeEditTier = () => {
        setEditingTier(null);
        setImageFile(null);
        setFilePreview(null);
    };
    const handleImageFileChange = (e) => {
        const file = e.target.files?.[0] || null;
        setImageFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setFilePreview(reader.result);
            reader.readAsDataURL(file);
        }
        else {
            setFilePreview(null);
        }
    };
    const saveTier = async () => {
        if (!editingTier)
            return;
        const benefits = tierForm.benefits.map((b) => b.trim()).filter(Boolean);
        try {
            setSaving(true);
            setError('');
            let imageUrl = tierForm.image_url.trim() || null;
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                formData.append('folder', 'trfc_medals');
                const result = await uploadImage(formData);
                imageUrl = result.url;
            }
            await updateAdminMedalTier(editingTier.id, {
                name: tierForm.name.trim(),
                description: tierForm.description.trim() || null,
                benefits,
                image_url: imageUrl,
                sort_order: Number(tierForm.sort_order) || 0,
                is_active: tierForm.is_active,
            });
            closeEditTier();
            await fetchAll();
        }
        catch (err) {
            setError(err.response?.data?.error || 'Failed to save tier');
        }
        finally {
            setSaving(false);
        }
    };
    const openOptionModal = (tierId, option) => {
        setOptionTierId(tierId);
        setEditingOption(option || null);
        setOptionForm({
            distance_km: option?.distance_km ?? 10,
            price: option?.price ?? 0,
            capacity: option?.capacity ?? '',
            is_active: option?.is_active ?? true,
        });
    };
    const saveOption = async () => {
        if (!optionTierId)
            return;
        try {
            setSaving(true);
            setError('');
            await upsertAdminMedalOption(optionTierId, {
                id: editingOption?.id,
                distance_km: Number(optionForm.distance_km),
                price: Number(optionForm.price),
                capacity: optionForm.capacity === '' || optionForm.capacity === null
                    ? null
                    : Number(optionForm.capacity),
                is_active: optionForm.is_active,
            });
            setOptionTierId(null);
            setEditingOption(null);
            await fetchAll();
        }
        catch (err) {
            setError(err.response?.data?.error || 'Failed to save option');
        }
        finally {
            setSaving(false);
        }
    };
    const confirmDeleteOption = async () => {
        if (!deleteOption)
            return;
        try {
            await deleteAdminMedalOption(deleteOption.tierId, deleteOption.optionId);
            await fetchAll();
        }
        catch (err) {
            setError(err.response?.data?.error || 'Failed to delete option');
        }
        finally {
            setDeleteOption(null);
        }
    };
    if (loading) {
        return _jsx("div", { className: "text-lg text-gray-600 dark:text-gray-400", children: "Loading medals..." });
    }
    return (_jsxs("div", { children: [_jsx(AdminPageHeader, { title: "Medals" }), error && (_jsx("div", { className: "mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm", children: error })), _jsxs("div", { className: "flex gap-2 mb-6", children: [_jsx("button", { type: "button", onClick: () => setTab('tiers'), className: `px-4 py-2 rounded-lg text-sm font-medium ${tab === 'tiers'
                            ? 'bg-primary dark:bg-primary-dark text-white dark:text-black'
                            : 'bg-gray-100 dark:bg-gray-800'}`, children: "Tiers & Options" }), _jsxs("button", { type: "button", onClick: () => setTab('purchases'), className: `px-4 py-2 rounded-lg text-sm font-medium ${tab === 'purchases'
                            ? 'bg-primary dark:bg-primary-dark text-white dark:text-black'
                            : 'bg-gray-100 dark:bg-gray-800'}`, children: ["Purchases (", purchases.length, ")"] })] }), tab === 'tiers' && (_jsx("div", { className: "space-y-6", children: tiers.map((tier) => (_jsxs("div", { className: "border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3 mb-4", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-xl font-semibold flex items-center gap-2", children: [tier.name, _jsxs("span", { className: "text-xs font-normal text-gray-500", children: ["/", tier.slug] }), !tier.is_active && (_jsx("span", { className: "text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded", children: "Inactive" }))] }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: tier.description || 'No description' })] }), _jsxs("button", { type: "button", onClick: () => openEditTier(tier), className: "flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:opacity-90", children: [_jsx(Edit2, { size: 16 }), " Edit tier"] })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-gray-500 border-b border-gray-200 dark:border-gray-700", children: [_jsx("th", { className: "py-2 pr-4", children: "Distance" }), _jsx("th", { className: "py-2 pr-4", children: "Price (KES)" }), _jsx("th", { className: "py-2 pr-4", children: "Capacity" }), _jsx("th", { className: "py-2 pr-4", children: "Active" }), _jsx("th", { className: "py-2", children: "Actions" })] }) }), _jsx("tbody", { children: (tier.options || []).map((opt) => (_jsxs("tr", { className: "border-b border-gray-100 dark:border-gray-700/50", children: [_jsxs("td", { className: "py-2 pr-4", children: [opt.distance_km, " km"] }), _jsx("td", { className: "py-2 pr-4", children: Number(opt.price).toLocaleString() }), _jsx("td", { className: "py-2 pr-4", children: opt.capacity ?? '—' }), _jsx("td", { className: "py-2 pr-4", children: opt.is_active ? 'Yes' : 'No' }), _jsxs("td", { className: "py-2 flex gap-2", children: [_jsx("button", { type: "button", onClick: () => openOptionModal(tier.id, opt), className: "p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700", children: _jsx(Edit2, { size: 14 }) }), _jsx("button", { type: "button", onClick: () => setDeleteOption({ tierId: tier.id, optionId: opt.id }), className: "p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600", children: _jsx(Trash2, { size: 14 }) })] })] }, opt.id))) })] }) }), _jsxs("button", { type: "button", onClick: () => openOptionModal(tier.id), className: "mt-3 flex items-center gap-1 text-sm text-primary dark:text-primary-dark", children: [_jsx(Plus, { size: 16 }), " Add distance option"] })] }, tier.id))) })), tab === 'purchases' && (_jsx(AdminResponsiveData, { mobile: _jsxs("div", { className: "space-y-3", children: [purchases.map((p) => (_jsxs(AdminMobileCard, { children: [_jsx("p", { className: "font-semibold text-gray-900 dark:text-white", children: p.tier_name }), _jsx(AdminMobileCardRow, { label: "Distance", value: `${p.distance_km} km` }), _jsx(AdminMobileCardRow, { label: "Buyer", value: p.buyer_name || '—' }), _jsx(AdminMobileCardRow, { label: "Status", value: p.payment_status }), _jsx(AdminMobileCardRow, { label: "Redeem", value: p.redeemed_at ? (_jsx("span", { className: "inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300", children: "Redeemed" })) : ('—') }), _jsx(AdminMobileCardRow, { label: "Amount", value: `KES ${Number(p.price).toLocaleString()}` })] }, p.id))), purchases.length === 0 && (_jsx("p", { className: "text-gray-500", children: "No medal purchases yet." }))] }), desktop: _jsxs("div", { className: "overflow-x-auto", children: [_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left border-b border-gray-200 dark:border-gray-700", children: [_jsx("th", { className: "py-2 pr-3", children: "Tier" }), _jsx("th", { className: "py-2 pr-3", children: "Distance" }), _jsx("th", { className: "py-2 pr-3", children: "Buyer" }), _jsx("th", { className: "py-2 pr-3", children: "Email" }), _jsx("th", { className: "py-2 pr-3", children: "Status" }), _jsx("th", { className: "py-2 pr-3", children: "Redeem" }), _jsx("th", { className: "py-2 pr-3", children: "Receipt" }), _jsx("th", { className: "py-2", children: "Date" })] }) }), _jsx("tbody", { children: purchases.map((p) => (_jsxs("tr", { className: "border-b border-gray-100 dark:border-gray-700/50", children: [_jsx("td", { className: "py-2 pr-3", children: p.tier_name }), _jsxs("td", { className: "py-2 pr-3", children: [p.distance_km, " km"] }), _jsx("td", { className: "py-2 pr-3", children: p.buyer_name || '—' }), _jsx("td", { className: "py-2 pr-3", children: p.email || '—' }), _jsx("td", { className: "py-2 pr-3", children: p.payment_status }), _jsx("td", { className: "py-2 pr-3", children: p.redeemed_at ? (_jsx("span", { className: "inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300", children: "Redeemed" })) : ('—') }), _jsx("td", { className: "py-2 pr-3", children: p.mpesa_receipt || '—' }), _jsx("td", { className: "py-2", children: p.created_at ? new Date(p.created_at).toLocaleString() : '—' })] }, p.id))) })] }), purchases.length === 0 && (_jsx("p", { className: "text-gray-500 py-6", children: "No medal purchases yet." }))] }) })), editingTier && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsxs("h3", { className: "text-lg font-semibold", children: ["Edit ", editingTier.name] }), _jsx("button", { type: "button", onClick: closeEditTier, children: _jsx(X, { size: 20 }) })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-1", children: "Name" }), _jsx("input", { className: "w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600", value: tierForm.name, onChange: (e) => setTierForm({ ...tierForm, name: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-1", children: "Description" }), _jsx("textarea", { className: "w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600", rows: 3, value: tierForm.description, onChange: (e) => setTierForm({ ...tierForm, description: e.target.value }) })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-1", children: "Upload Image" }), _jsx("input", { type: "file", accept: "image/*", onChange: handleImageFileChange, className: "w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600" }), filePreview && (_jsx("div", { className: "mt-2 relative w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden", children: _jsx("img", { src: filePreview, alt: "Preview", className: "w-full h-full object-cover" }) })), !filePreview && tierForm.image_url && (_jsx("div", { className: "mt-2 relative w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden", children: _jsx("img", { src: tierForm.image_url, alt: "Current", className: "w-full h-full object-cover" }) }))] }), _jsx("div", { className: "text-center text-gray-500 dark:text-gray-400 text-sm", children: "OR" }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-1", children: "Image URL" }), _jsx("input", { type: "url", className: "w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600", placeholder: "https://example.com/image.jpg", value: tierForm.image_url, onChange: (e) => setTierForm({ ...tierForm, image_url: e.target.value }) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-1", children: "Benefits" }), tierForm.benefits.map((b, i) => (_jsxs("div", { className: "flex gap-2 mb-2", children: [_jsx("input", { className: "flex-1 border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600", value: b, onChange: (e) => {
                                                        const next = [...tierForm.benefits];
                                                        next[i] = e.target.value;
                                                        setTierForm({ ...tierForm, benefits: next });
                                                    } }), _jsx("button", { type: "button", onClick: () => setTierForm({
                                                        ...tierForm,
                                                        benefits: tierForm.benefits.length <= 1
                                                            ? ['']
                                                            : tierForm.benefits.filter((_, j) => j !== i),
                                                    }), children: _jsx(Trash2, { size: 16 }) })] }, i))), _jsx("button", { type: "button", className: "text-sm text-primary", onClick: () => setTierForm({ ...tierForm, benefits: [...tierForm.benefits, ''] }), children: "+ Add benefit" })] }), _jsxs("div", { className: "flex gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-sm mb-1", children: "Sort order" }), _jsx("input", { type: "number", className: "w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600", value: tierForm.sort_order, onChange: (e) => setTierForm({ ...tierForm, sort_order: Number(e.target.value) }) })] }), _jsxs("label", { className: "flex items-end gap-2 pb-2", children: [_jsx("input", { type: "checkbox", checked: tierForm.is_active, onChange: (e) => setTierForm({ ...tierForm, is_active: e.target.checked }) }), "Active"] })] }), _jsx("button", { type: "button", disabled: saving, onClick: saveTier, className: "w-full bg-primary dark:bg-primary-dark text-white dark:text-black py-2 rounded-lg disabled:opacity-50", children: saving ? 'Saving…' : 'Save tier' })] })] }) })), optionTierId && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h3", { className: "text-lg font-semibold", children: editingOption ? 'Edit option' : 'Add distance option' }), _jsx("button", { type: "button", onClick: () => setOptionTierId(null), children: _jsx(X, { size: 20 }) })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-1", children: "Distance (km)" }), _jsx("input", { type: "number", className: "w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600", value: optionForm.distance_km, onChange: (e) => setOptionForm({ ...optionForm, distance_km: Number(e.target.value) }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-1", children: "Price (KES)" }), _jsx("input", { type: "number", className: "w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600", value: optionForm.price, onChange: (e) => setOptionForm({ ...optionForm, price: Number(e.target.value) }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-1", children: "Capacity (blank = unlimited)" }), _jsx("input", { type: "number", className: "w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600", value: optionForm.capacity, onChange: (e) => setOptionForm({ ...optionForm, capacity: e.target.value }) })] }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: optionForm.is_active, onChange: (e) => setOptionForm({ ...optionForm, is_active: e.target.checked }) }), "Active"] }), _jsx("button", { type: "button", disabled: saving, onClick: saveOption, className: "w-full bg-primary dark:bg-primary-dark text-white dark:text-black py-2 rounded-lg disabled:opacity-50", children: saving ? 'Saving…' : 'Save option' })] })] }) })), _jsx(AdminConfirmDialog, { open: !!deleteOption, title: "Remove distance option?", message: "If this option has purchases it will be deactivated instead of deleted.", onConfirm: confirmDeleteOption, onCancel: () => setDeleteOption(null) })] }));
}
//# sourceMappingURL=AdminMedals.js.map