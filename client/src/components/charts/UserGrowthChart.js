import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from 'recharts';
export default function UserGrowthChart({ data }) {
    const formattedData = data.map((item) => ({
        ...item,
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
    return (_jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(LineChart, { data: formattedData, margin: { top: 5, right: 30, left: 0, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e5e7eb" }), _jsx(XAxis, { dataKey: "date", stroke: "#9ca3af", style: { fontSize: '12px' } }), _jsx(YAxis, { stroke: "#9ca3af", style: { fontSize: '12px' } }), _jsx(Tooltip, { contentStyle: {
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                    } }), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: "newUsers", stroke: "#111827", strokeWidth: 2, name: "New Users", dot: { r: 3 } }), _jsx(Line, { type: "monotone", dataKey: "cumulative", stroke: "#6b7280", strokeWidth: 2, name: "Cumulative", dot: false })] }) }));
}
//# sourceMappingURL=UserGrowthChart.js.map