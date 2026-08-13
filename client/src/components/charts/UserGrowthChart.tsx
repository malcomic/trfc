import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface UserGrowthChartProps {
  data: Array<{ date: string; newUsers: number; cumulative: number }>
}

export default function UserGrowthChart({ data }: UserGrowthChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
        <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="newUsers"
          stroke="#111827"
          strokeWidth={2}
          name="New Users"
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="cumulative"
          stroke="#6b7280"
          strokeWidth={2}
          name="Cumulative"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
