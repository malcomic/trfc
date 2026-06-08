import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
const COLORS = {
    paid: '#10b981',
    pending: '#9CA3AF',
    failed: '#ef4444',
};
export default function PaymentDistribution({ data }) {
    const formattedData = data.map(item => ({
        name: item.payment_status.charAt(0).toUpperCase() + item.payment_status.slice(1),
        value: item.count,
        status: item.payment_status,
    }));
    return (_jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: formattedData, cx: "50%", cy: "50%", labelLine: false, label: (entry) => `${entry.name}: ${entry.value}`, outerRadius: 80, fill: "#8884d8", dataKey: "value", children: formattedData.map((entry) => (_jsx(Cell, { fill: COLORS[entry.status] || '#6B7280' }, `cell-${entry.status}`))) }), _jsx(Tooltip, { formatter: (value) => `${value} orders`, contentStyle: {
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                    } }), _jsx(Legend, {})] }) }));
}
//# sourceMappingURL=PaymentDistribution.js.map