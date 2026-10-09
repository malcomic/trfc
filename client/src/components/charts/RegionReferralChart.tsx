import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface RegionReferralChartProps {
  data: Array<{ region: string; referredSales: number; commission: number }>
}

export default function RegionReferralChart({ data }: RegionReferralChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="region" stroke="#9ca3af" style={{ fontSize: '12px' }} />
        <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
          formatter={(value) => `KES ${Number(value ?? 0).toLocaleString()}`}
        />
        <Legend />
        <Bar dataKey="referredSales" fill="#111827" name="Referred sales" radius={[8, 8, 0, 0]} />
        <Bar dataKey="commission" fill="#10b981" name="Captain commission" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
