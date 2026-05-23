import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from 'recharts';
export default function TopProducts({ data }) {
    return (_jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(BarChart, { data: data, margin: { top: 5, right: 30, left: 0, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e5e7eb" }), _jsx(XAxis, { dataKey: "name", stroke: "#9ca3af", style: { fontSize: '12px' }, angle: -45, textAnchor: "end", height: 100 }), _jsx(YAxis, { stroke: "#9ca3af", style: { fontSize: '12px' } }), _jsx(Tooltip, { contentStyle: {
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                    }, formatter: (value) => `KES ${value.toLocaleString()}` }), _jsx(Legend, {}), _jsx(Bar, { dataKey: "revenue", fill: "#E8401C", name: "Revenue", radius: [8, 8, 0, 0] })] }) }));
}
//# sourceMappingURL=TopProducts.js.map