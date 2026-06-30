import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { DEFAULT_TYPOGRAPHY, TYPOGRAPHY_FIELDS, TYPOGRAPHY_LABELS, getAllCatalogFonts, getCatalogForField, } from '../../config/fontCatalog';
import { getTypographyForAdmin, resetTypography, updateTypography, } from '../../api/admin/settings';
import { useFonts } from '../../context/FontContext';
import { applyTypography, loadGoogleFontsBatched } from '../../utils/googleFonts';
export default function AdminAppearance() {
    const { applyTypographySettings } = useFonts();
    const [settings, setSettings] = useState({ ...DEFAULT_TYPOGRAPHY });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                setLoading(true);
                setError('');
                const data = await getTypographyForAdmin();
                setSettings(data);
            }
            catch (err) {
                setError('Failed to load typography settings');
                console.error(err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);
    useEffect(() => {
        loadGoogleFontsBatched(getAllCatalogFonts());
    }, []);
    useEffect(() => {
        applyTypography(settings);
    }, [settings]);
    const handleFieldChange = (field, value) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
        setSuccess('');
    };
    const handleSave = async () => {
        try {
            setSaving(true);
            setError('');
            setSuccess('');
            const saved = await updateTypography(settings);
            setSettings(saved);
            applyTypographySettings(saved);
            setSuccess('Typography settings saved. Changes are live on the public site.');
        }
        catch (err) {
            setError(err.response?.data?.error || 'Failed to save typography settings');
        }
        finally {
            setSaving(false);
        }
    };
    const handleReset = async () => {
        try {
            setSaving(true);
            setError('');
            setSuccess('');
            const restored = await resetTypography();
            setSettings(restored);
            applyTypographySettings(restored);
            setSuccess('Typography reset to TRFC defaults.');
        }
        catch (err) {
            setError(err.response?.data?.error || 'Failed to reset typography settings');
        }
        finally {
            setSaving(false);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[240px]", children: _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading appearance settings..." }) }));
    }
    return (_jsxs("div", { children: [_jsx(AdminPageHeader, { title: "Appearance", subtitle: "Choose fonts for the public site. Changes apply to all visitors.", actions: _jsxs(_Fragment, { children: [_jsxs("button", { type: "button", onClick: handleReset, disabled: saving, className: "inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50", children: [_jsx(RotateCcw, { size: 18 }), "Reset to defaults"] }), _jsxs("button", { type: "button", onClick: handleSave, disabled: saving, className: "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary dark:bg-primary-dark text-white dark:text-black hover:opacity-90 disabled:opacity-50", children: [_jsx(Save, { size: 18 }), saving ? 'Saving...' : 'Save changes'] })] }) }), error && (_jsx("div", { className: "mb-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-red-700 dark:text-red-300", children: error })), success && (_jsx("div", { className: "mb-6 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3 text-green-700 dark:text-green-300", children: success })), _jsxs("div", { className: "grid gap-8 lg:grid-cols-2", children: [_jsxs("section", { className: "rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: "Font roles" }), _jsx("div", { className: "space-y-5", children: TYPOGRAPHY_FIELDS.map((field) => (_jsxs("div", { children: [_jsx("label", { htmlFor: field, className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: TYPOGRAPHY_LABELS[field] }), _jsx("select", { id: field, value: settings[field], onChange: (event) => handleFieldChange(field, event.target.value), className: "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark", style: { fontFamily: settings[field] }, children: getCatalogForField(field).map((font) => (_jsx("option", { value: font, style: { fontFamily: font }, children: font }, font))) })] }, field))) })] }), _jsxs("section", { className: "rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: "Live preview" }), _jsxs("div", { className: "rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-6 space-y-5", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-bold tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-2", style: { fontFamily: settings.condensed_font }, children: "Thika Road FC" }), _jsxs("h3", { className: "text-4xl leading-tight text-gray-900 dark:text-white", style: { fontFamily: settings.display_font }, children: ["TRAIN. COMPETE. ", _jsx("span", { className: "text-primary dark:text-primary-dark", children: "BELONG." })] })] }), _jsx("p", { className: "text-base leading-relaxed text-gray-700 dark:text-gray-300", style: { fontFamily: settings.body_font }, children: "Thika Road Fitness Community brings runners together through events, programs, and a shared love of movement across Nairobi." }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", style: { fontFamily: settings.sans_font }, children: "Sans fallback sample used for general UI text and form elements." })] })] })] })] }));
}
//# sourceMappingURL=AdminAppearance.js.map