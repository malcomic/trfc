import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from 'recharts';
export default function PaymentTimelineChart({ data }) {
    const formattedData = data.map((item) => ({
        ...item,
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
    return (_jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(AreaChart, { data: formattedData, margin: { top: 5, right: 30, left: 0, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e5e7eb" }), _jsx(XAxis, { dataKey: "date", stroke: "#9ca3af", style: { fontSize: '12px' } }), _jsx(YAxis, { stroke: "#9ca3af", style: { fontSize: '12px' } }), _jsx(Tooltip, { contentStyle: {
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                    } }), _jsx(Legend, {}), _jsx(Area, { type: "monotone", dataKey: "successful", stackId: "1", stroke: "#166534", fill: "#86efac", name: "Paid" }), _jsx(Area, { type: "monotone", dataKey: "pending", stackId: "1", stroke: "#a16207", fill: "#fde68a", name: "Pending" }), _jsx(Area, { type: "monotone", dataKey: "failed", stackId: "1", stroke: "#991b1b", fill: "#fecaca", name: "Failed" })] }) }));
}
//# sourceMappingURL=PaymentTimelineChart.js.map