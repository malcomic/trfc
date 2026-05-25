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

interface TopEventsProps {
  data: Array<{
    name: string
    ticketsSold: number
  }>
}

export default function TopEvents({ data }: TopEventsProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          stroke="#9ca3af"
          style={{ fontSize: '12px' }}
          angle={-45}
          textAnchor="end"
          height={100}
        />
        <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
          formatter={(value: any) => `${value} tickets`}
        />
        <Legend />
        <Bar dataKey="ticketsSold" fill="#FF4500" name="Tickets Sold" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
