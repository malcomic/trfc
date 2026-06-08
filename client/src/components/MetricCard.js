import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TrendingUp, TrendingDown } from 'lucide-react';
export default function MetricCard({ title, value, trend = 'neutral', trendPercent = 0, icon, unit = '', subtitle, onClick, loading = false, }) {
    const getTrendColor = () => {
        if (trend === 'up')
            return 'text-green-600 dark:text-green-400';
        if (trend === 'down')
            return 'text-red-600 dark:text-red-400';
        return 'text-gray-500 dark:text-gray-400';
    };
    const getTrendBgColor = () => {
        if (trend === 'up')
            return 'bg-green-50 dark:bg-green-900/20';
        if (trend === 'down')
            return 'bg-red-50 dark:bg-red-900/20';
        return 'bg-gray-50 dark:bg-gray-800';
    };
    return (_jsxs("div", { onClick: onClick, className: `bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-xl p-6 ${onClick ? 'cursor-pointer hover:shadow-lg dark:hover:shadow-2xl transition' : ''}`, children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-gray-600 dark:text-gray-400 text-sm font-medium", children: title }), subtitle && _jsx("p", { className: "text-gray-500 dark:text-gray-500 text-xs mt-1", children: subtitle })] }), icon && _jsx("div", { className: "text-accent light:text-accent-light dark:text-accent light:text-accent-light ml-2", children: icon })] }), loading ? (_jsx("div", { className: "animate-pulse", children: _jsx("div", { className: "h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" }) })) : (_jsx("div", { className: "mb-4", children: _jsxs("p", { className: "text-4xl font-bold text-gray-900 dark:text-white mb-1", children: [typeof value === 'number' ? value.toLocaleString() : value, unit && _jsx("span", { className: "text-2xl font-normal text-gray-500 dark:text-gray-400 ml-1", children: unit })] }) })), trend !== 'neutral' && !loading && (_jsxs("div", { className: `flex items-center gap-1 ${getTrendColor()} text-sm font-medium`, children: [trend === 'up' ? (_jsx(TrendingUp, { className: "w-4 h-4" })) : (_jsx(TrendingDown, { className: "w-4 h-4" })), _jsxs("span", { children: [Math.abs(trendPercent), "% ", trend === 'up' ? 'increase' : 'decrease'] })] })), trend !== 'neutral' && !loading && (_jsx("div", { className: `mt-3 h-1 w-full ${getTrendBgColor()} rounded-full overflow-hidden`, children: _jsx("div", { className: `h-full ${trend === 'up' ? 'bg-green-500' : 'bg-red-500'}`, style: { width: `${Math.min(Math.abs(trendPercent), 100)}%` } }) }))] }));
}
//# sourceMappingURL=MetricCard.js.map