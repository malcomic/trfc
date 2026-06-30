import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function AdminMobileCardRow({ label, value, }) {
    return (_jsxs("div", { className: "flex justify-between gap-3 text-sm", children: [_jsx("span", { className: "text-gray-500 dark:text-gray-400 shrink-0", children: label }), _jsx("span", { className: "text-gray-900 dark:text-gray-100 text-right break-words", children: value })] }));
}
export default function AdminMobileCard({ children, footer }) {
    return (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3", children: [_jsx("div", { className: "space-y-2", children: children }), footer && (_jsx("div", { className: "pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2", children: footer }))] }));
}
//# sourceMappingURL=AdminMobileCard.js.map