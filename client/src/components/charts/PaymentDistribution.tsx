import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'

interface PaymentDistributionProps {
  data: Array<{
    payment_status: string
    count: number
  }>
}

const COLORS: Record<string, string> = {
  paid: '#10b981',
  pending: '#9CA3AF',
  failed: '#ef4444',
}

export default function PaymentDistribution({ data }: PaymentDistributionProps) {
  const formattedData = data.map(item => ({
    name: item.payment_status.charAt(0).toUpperCase() + item.payment_status.slice(1),
    value: item.count,
    status: item.payment_status,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={formattedData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry: any) => `${entry.name}: ${entry.value}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {formattedData.map((entry) => (
            <Cell key={`cell-${entry.status}`} fill={COLORS[entry.status] || '#6B7280'} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any) => `${value} orders`}
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
