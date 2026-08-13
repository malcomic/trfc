import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function toAnalyticsParams(value) {
    if (value.mode === 'custom') {
        return { startDate: value.startDate, endDate: value.endDate };
    }
    return { days: value.days };
}
export function describeDateRange(value) {
    if (value.mode === 'custom') {
        return `${value.startDate} to ${value.endDate}`;
    }
    return `Last ${value.days} days`;
}
export default function AnalyticsDateRange({ value, onChange }) {
    const preset = value.mode === 'preset' ? value.days : null;
    return (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-4 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100", children: "Date Range" }), _jsx("div", { className: "flex flex-wrap gap-3", children: ['7', '30', '90'].map((range) => (_jsxs("button", { type: "button", onClick: () => onChange({ mode: 'preset', days: range }), className: `px-4 py-2 rounded transition ${preset === range
                                ? 'bg-primary dark:bg-primary-dark text-white dark:text-black'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`, children: ["Last ", range, " days"] }, range))) })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400", children: "Start date" }), _jsx("input", { type: "date", value: value.mode === 'custom' ? value.startDate : '', onChange: (e) => {
                                    const startDate = e.target.value;
                                    const endDate = value.mode === 'custom' ? value.endDate : startDate;
                                    if (!startDate)
                                        return;
                                    onChange({ mode: 'custom', startDate, endDate: endDate || startDate });
                                }, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400", children: "End date" }), _jsx("input", { type: "date", value: value.mode === 'custom' ? value.endDate : '', onChange: (e) => {
                                    const endDate = e.target.value;
                                    const startDate = value.mode === 'custom' ? value.startDate : endDate;
                                    if (!endDate)
                                        return;
                                    onChange({ mode: 'custom', startDate: startDate || endDate, endDate });
                                }, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" })] })] })] }));
}
//# sourceMappingURL=AnalyticsDateRange.js.map