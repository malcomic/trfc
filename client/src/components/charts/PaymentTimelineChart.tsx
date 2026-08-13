import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface PaymentTimelineChartProps {
  data: Array<{
    date: string
    successful: number
    pending: number
    failed: number
  }>
}

export default function PaymentTimelineChart({ data }: PaymentTimelineChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={formattedData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
        <Area type="monotone" dataKey="successful" stackId="1" stroke="#166534" fill="#86efac" name="Paid" />
        <Area type="monotone" dataKey="pending" stackId="1" stroke="#a16207" fill="#fde68a" name="Pending" />
        <Area type="monotone" dataKey="failed" stackId="1" stroke="#991b1b" fill="#fecaca" name="Failed" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
