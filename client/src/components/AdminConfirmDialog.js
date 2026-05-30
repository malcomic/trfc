import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function AdminConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', onConfirm, onCancel, }) {
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900 dark:text-white mb-2", children: title }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 mb-6", children: message }), _jsxs("div", { className: "flex gap-3 justify-end", children: [_jsx("button", { type: "button", onClick: onCancel, className: "px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100", children: cancelLabel }), _jsx("button", { type: "button", onClick: onConfirm, className: `px-4 py-2 rounded-lg text-white ${variant === 'danger'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-primary dark:bg-primary-dark hover:opacity-90'}`, children: confirmLabel })] })] }) }));
}
//# sourceMappingURL=AdminConfirmDialog.js.map