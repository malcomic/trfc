import { useEffect, useRef, useState } from 'react'
import { Loader, AlertCircle, RefreshCw, Download } from 'lucide-react'
import Papa from 'papaparse'
import MetricCard from '../components/MetricCard'
import RevenueChart from '../components/charts/RevenueChart'
import PaymentDistribution from '../components/charts/PaymentDistribution'
import TopProducts from '../components/charts/TopProducts'
import TopEvents from '../components/charts/TopEvents'
import {
  getAnalyticsSummary,
  getRevenueTimeline,
  getPaymentStats,
  getTopProducts,
  getTopEvents,
  getUserStats,
  getOrderStats,
} from '../api/analytics'

interface DashboardData {
  summary: any
  revenueTimeline: any[]
  paymentStats: Array<{ payment_status: string; count: number }>
  topProducts: any[]
  topEvents: any[]
  userStats: any
  orderStats: any
}

export default function AdminAnalytics() {
  const reportRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<DashboardData>({
    summary: null,
    revenueTimeline: [],
    paymentStats: [],
    topProducts: [],
    topEvents: [],
    userStats: null,
    orderStats: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError('')

      const [summary, timeline, payments, products, events, users, orders] = await Promise.all([
        getAnalyticsSummary(),
        getRevenueTimeline({ days: dateRange }),
        getPaymentStats(),
        getTopProducts({ limit: 10 }),
        getTopEvents({ limit: 5 }),
        getUserStats(),
        getOrderStats(),
      ])

      const paymentStatsArray = [
        { payment_status: 'paid', count: payments.successful },
        { payment_status: 'pending', count: payments.pending },
        { payment_status: 'failed', count: payments.failed },
      ]

      setData({
        summary,
        revenueTimeline: timeline,
        paymentStats: paymentStatsArray,
        topProducts: products,
        topEvents: events,
        userStats: users,
        orderStats: orders,
      })
    } catch (err: any) {
      console.error('Error fetching analytics:', err)
      setError(err.response?.data?.error || 'Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const csvData = {
      'Summary Metrics': {
        'Total Revenue': data.summary?.totalRevenue,
        'This Month Revenue': data.summary?.thisMonthRevenue,
        'Total Orders': data.summary?.totalOrders,
        'Payment Success Rate': `${data.summary?.paymentSuccessRate}%`,
        'Active Users': data.userStats?.total,
        'Average Order Value': data.summary?.avgOrderValue,
      },
      'Top Products': data.topProducts.map((p: any) => ({
        'Product Name': p.name,
        Revenue: p.revenue,
        'Quantity Sold': p.quantitySold,
        Category: p.category,
      })),
      'Top Events': data.topEvents.map((e: any) => ({
        'Event Name': e.name,
        'Tickets Sold': e.ticketsSold,
        Capacity: e.capacity,
        Utilization: e.utilization,
      })),
    }

    const summaryCSV = Papa.unparse([csvData['Summary Metrics']])
    const productsCSV = Papa.unparse(csvData['Top Products'])
    const eventsCSV = Papa.unparse(csvData['Top Events'])

    const fullCSV =
      `ANALYTICS REPORT - ${new Date().toLocaleDateString()}\n\n` +
      `SUMMARY METRICS\n${summaryCSV}\n\n` +
      `TOP PRODUCTS\n${productsCSV}\n\n` +
      `TOP EVENTS\n${eventsCSV}`

    const blob = new Blob([fullCSV], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportToPDF = () => {
    const element = reportRef.current
    if (!element) return

    import('html2pdf.js').then((html2pdf) => {
      const opt = {
        margin: 10,
        filename: `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'landscape' },
      }

      html2pdf.default().set(opt).from(element).save()
    })
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <h3 className="text-red-900 dark:text-red-300 font-semibold mb-2">Error Loading Analytics</h3>
          <p className="text-red-700 dark:text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={reportRef} className="space-y-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-gray-800 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your business performance and metrics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={exportToPDF}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-2 bg-primary dark:bg-primary-dark text-white px-4 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-4">
        <label className="block text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100">Date Range</label>
        <div className="flex gap-3">
          {['7', '30', '90'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range as '7' | '30' | '90')}
              className={`px-4 py-2 rounded transition ${
                dateRange === range
                  ? 'bg-primary dark:bg-primary-dark text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Last {range} days
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`KES ${data.summary?.totalRevenue?.toLocaleString() || 0}`}
          loading={loading}
        />
        <MetricCard
          title="This Month Revenue"
          value={`KES ${data.summary?.thisMonthRevenue?.toLocaleString() || 0}`}
          loading={loading}
        />
        <MetricCard
          title="Total Orders"
          value={data.summary?.totalOrders || 0}
          unit="orders"
          loading={loading}
        />
        <MetricCard
          title="Payment Success Rate"
          value={`${data.summary?.paymentSuccessRate?.toFixed(1) || 0}%`}
          loading={loading}
        />
        <MetricCard
          title="Active Users"
          value={data.userStats?.total || 0}
          unit="users"
          loading={loading}
        />
        <MetricCard
          title="Average Order Value"
          value={`KES ${data.summary?.avgOrderValue?.toFixed(0) || 0}`}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Revenue Trend</h3>
          {loading ? (
            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center">
              <Loader className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : data.revenueTimeline.length > 0 ? (
            <RevenueChart data={data.revenueTimeline} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>No revenue data available</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Payment Status Distribution</h3>
          {loading ? (
            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center">
              <Loader className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : data.paymentStats && data.paymentStats.length > 0 ? (
            <PaymentDistribution data={data.paymentStats} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>No payment data available</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Top Products by Revenue</h3>
          {loading ? (
            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center">
              <Loader className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : data.topProducts.length > 0 ? (
            <TopProducts data={data.topProducts} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>No product data available</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Top Events by Tickets Sold</h3>
          {loading ? (
            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center">
              <Loader className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : data.topEvents.length > 0 ? (
            <TopEvents data={data.topEvents} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>No event data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
