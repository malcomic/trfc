import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function AdminPageHeader({ title, subtitle, actions }) {
    return (_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white", children: title }), subtitle && (_jsx("p", { className: "text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base", children: subtitle }))] }), actions && (_jsx("div", { className: "flex flex-wrap gap-2 [&_button]:min-h-[44px] [&_a]:min-h-[44px]", children: actions }))] }));
}
//# sourceMappingURL=AdminPageHeader.js.map