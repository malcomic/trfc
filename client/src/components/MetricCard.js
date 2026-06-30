import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TrendingUp, TrendingDown } from 'lucide-react';
export default function MetricCard({ title, value, trend = 'neutral', trendPercent = 0, icon, unit = '', subtitle, onClick, loading = false, }) {
    const getTrendColor = () => {
        if (trend === 'up')
            return 'text-success-green';
        if (trend === 'down')
            return 'text-danger-red';
        return 'text-fog';
    };
    const getTrendBgColor = () => {
        if (trend === 'up')
            return 'bg-success-green/10';
        if (trend === 'down')
            return 'bg-danger-red/10';
        return 'bg-smoke';
    };
    return (_jsxs("div", { onClick: onClick, className: `bg-night-light dark:bg-ash rounded-lg shadow dark:shadow-xl p-6 border border-ash-light dark:border-mist ${onClick ? 'cursor-pointer hover:shadow-lg dark:hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]' : ''}`, children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-chalk-light/70 dark:text-fog text-sm font-medium", children: title }), subtitle && _jsx("p", { className: "text-chalk-light/50 dark:text-fog/70 text-xs mt-1", children: subtitle })] }), icon && _jsx("div", { className: "text-fire dark:text-fire ml-2", children: icon })] }), loading ? (_jsx("div", { className: "animate-pulse", children: _jsx("div", { className: "h-10 bg-ash-light dark:bg-mist rounded w-32 mb-2" }) })) : (_jsx("div", { className: "mb-4", children: _jsxs("p", { className: "text-4xl font-bold text-chalk-light dark:text-chalk mb-1", children: [typeof value === 'number' ? value.toLocaleString() : value, unit && _jsx("span", { className: "text-2xl font-normal text-fog ml-1", children: unit })] }) })), trend !== 'neutral' && !loading && (_jsxs("div", { className: `flex items-center gap-1 ${getTrendColor()} text-sm font-medium`, children: [trend === 'up' ? (_jsx(TrendingUp, { className: "w-4 h-4" })) : (_jsx(TrendingDown, { className: "w-4 h-4" })), _jsxs("span", { children: [Math.abs(trendPercent), "% ", trend === 'up' ? 'increase' : 'decrease'] })] })), trend !== 'neutral' && !loading && (_jsx("div", { className: `mt-3 h-1 w-full ${getTrendBgColor()} rounded-full overflow-hidden`, children: _jsx("div", { className: `h-full ${trend === 'up' ? 'bg-success-green' : 'bg-danger-red'}`, style: { width: `${Math.min(Math.abs(trendPercent), 100)}%` } }) }))] }));
}
//# sourceMappingURL=MetricCard.js.map