import { useEffect, useRef, useState } from 'react'
import { Loader, AlertCircle, RefreshCw, Download } from 'lucide-react'
import Papa from 'papaparse'
import MetricCard from '../components/MetricCard'
import RevenueChart from '../components/charts/RevenueChart'
import PaymentDistribution from '../components/charts/PaymentDistribution'
import TopProducts from '../components/charts/TopProducts'
import TopEvents from '../components/charts/TopEvents'
import CategoryRevenueChart from '../components/charts/CategoryRevenueChart'
import UserGrowthChart from '../components/charts/UserGrowthChart'
import PaymentTimelineChart from '../components/charts/PaymentTimelineChart'
import AnalyticsDateRange, {
  DateRangeValue,
  describeDateRange,
  toAnalyticsParams,
} from '../components/admin/AnalyticsDateRange'
import AdminPageHeader from '../components/admin/AdminPageHeader'
import {
  getAnalyticsSummary,
  getRevenueTimeline,
  getPaymentStats,
  getTopProducts,
  getTopEvents,
  getUserStats,
  getOrderStats,
  getRevenueByCategory,
  getUserGrowth,
  getPaymentTimeline,
  getEventAttendance,
  type AnalyticsSummary,
  type RevenueTimelinePoint,
  type TopProduct,
  type TopEvent,
  type UserStats,
  type OrderStats,
  type CategoryRevenue,
  type UserGrowthPoint,
  type PaymentTimelinePoint,
  type EventAttendance,
} from '../api/analytics'

type SectionState<T> = {
  data: T
  loading: boolean
  error: string
}

function ChartPanel({
  title,
  loading,
  error,
  empty,
  children,
}: {
  title: string
  loading: boolean
  error: string
  empty: boolean
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
      {loading ? (
        <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center">
          <Loader className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="h-64 flex items-center justify-center text-red-600 dark:text-red-400 text-sm px-4 text-center">
          {error}
        </div>
      ) : empty ? (
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <p>No data available</p>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

export default function AdminAnalytics() {
  const reportRef = useRef<HTMLDivElement>(null)
  const [dateRange, setDateRange] = useState<DateRangeValue>({ mode: 'preset', days: '30' })

  const [summary, setSummary] = useState<SectionState<AnalyticsSummary | null>>({
    data: null,
    loading: true,
    error: '',
  })
  const [revenueTimeline, setRevenueTimeline] = useState<SectionState<RevenueTimelinePoint[]>>({
    data: [],
    loading: true,
    error: '',
  })
  const [paymentStats, setPaymentStats] = useState<
    SectionState<Array<{ payment_status: string; count: number }>>
  >({ data: [], loading: true, error: '' })
  const [topProducts, setTopProducts] = useState<SectionState<TopProduct[]>>({
    data: [],
    loading: true,
    error: '',
  })
  const [topEvents, setTopEvents] = useState<SectionState<TopEvent[]>>({
    data: [],
    loading: true,
    error: '',
  })
  const [userStats, setUserStats] = useState<SectionState<UserStats | null>>({
    data: null,
    loading: true,
    error: '',
  })
  const [orderStats, setOrderStats] = useState<SectionState<OrderStats | null>>({
    data: null,
    loading: true,
    error: '',
  })
  const [categories, setCategories] = useState<SectionState<CategoryRevenue[]>>({
    data: [],
    loading: true,
    error: '',
  })
  const [userGrowth, setUserGrowth] = useState<SectionState<UserGrowthPoint[]>>({
    data: [],
    loading: true,
    error: '',
  })
  const [paymentTimeline, setPaymentTimeline] = useState<SectionState<PaymentTimelinePoint[]>>({
    data: [],
    loading: true,
    error: '',
  })
  const [attendance, setAttendance] = useState<SectionState<EventAttendance[]>>({
    data: [],
    loading: true,
    error: '',
  })

  const anyLoading =
    summary.loading ||
    revenueTimeline.loading ||
    paymentStats.loading ||
    topProducts.loading ||
    topEvents.loading

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    const params = toAnalyticsParams(dateRange)

    setSummary((s) => ({ ...s, loading: true, error: '' }))
    setRevenueTimeline((s) => ({ ...s, loading: true, error: '' }))
    setPaymentStats((s) => ({ ...s, loading: true, error: '' }))
    setTopProducts((s) => ({ ...s, loading: true, error: '' }))
    setTopEvents((s) => ({ ...s, loading: true, error: '' }))
    setUserStats((s) => ({ ...s, loading: true, error: '' }))
    setOrderStats((s) => ({ ...s, loading: true, error: '' }))
    setCategories((s) => ({ ...s, loading: true, error: '' }))
    setUserGrowth((s) => ({ ...s, loading: true, error: '' }))
    setPaymentTimeline((s) => ({ ...s, loading: true, error: '' }))
    setAttendance((s) => ({ ...s, loading: true, error: '' }))

    const load = async <T,>(
      fn: () => Promise<T>,
      onSuccess: (data: T) => void,
      onError: (message: string) => void
    ) => {
      try {
        const data = await fn()
        onSuccess(data)
      } catch (err: any) {
        onError(err.response?.data?.error || 'Failed to load')
      }
    }

    await Promise.all([
      load(
        () => getAnalyticsSummary(params),
        (data) => setSummary({ data, loading: false, error: '' }),
        (error) => setSummary((prev) => ({ ...prev, loading: false, error }))
      ),
      load(
        () => getRevenueTimeline(params),
        (data) => setRevenueTimeline({ data, loading: false, error: '' }),
        (error) => setRevenueTimeline((prev) => ({ ...prev, loading: false, error }))
      ),
      load(
        () => getPaymentStats(params),
        (payments) =>
          setPaymentStats({
            data: [
              { payment_status: 'paid', count: payments.successful },
              { payment_status: 'pending', count: payments.pending },
              { payment_status: 'failed', count: payments.failed },
            ],
            loading: false,
            error: '',
          }),
        (error) => setPaymentStats((prev) => ({ ...prev, loading: false, error }))
      ),
      load(
        () => getTopProducts({ ...params, limit: 10 }),
        (data) => setTopProducts({ data, loading: false, error: '' }),
        (error) => setTopProducts((prev) => ({ ...prev, loading: false, error }))
      ),
      load(
        () => getTopEvents({ ...params, limit: 5 }),
        (data) => setTopEvents({ data, loading: false, error: '' }),
        (error) => setTopEvents((prev) => ({ ...prev, loading: false, error }))
      ),
      load(
        () => getUserStats(params),
        (data) => setUserStats({ data, loading: false, error: '' }),
        (error) => setUserStats((prev) => ({ ...prev, loading: false, error }))
      ),
      load(
        () => getOrderStats(params),
        (data) => setOrderStats({ data, loading: false, error: '' }),
        (error) => setOrderStats((prev) => ({ ...prev, loading: false, error }))
      ),
      load(
        () => getRevenueByCategory(params),
        (data) => setCategories({ data, loading: false, error: '' }),
        (error) => setCategories((prev) => ({ ...prev, loading: false, error }))
      ),
      load(
        () => getUserGrowth(params),
        (data) => setUserGrowth({ data, loading: false, error: '' }),
        (error) => setUserGrowth((prev) => ({ ...prev, loading: false, error }))
      ),
      load(
        () => getPaymentTimeline(params),
        (data) => setPaymentTimeline({ data, loading: false, error: '' }),
        (error) => setPaymentTimeline((prev) => ({ ...prev, loading: false, error }))
      ),
      load(
        () => getEventAttendance(params),
        (data) => setAttendance({ data, loading: false, error: '' }),
        (error) => setAttendance((prev) => ({ ...prev, loading: false, error }))
      ),
    ])
  }

  const exportToCSV = () => {
    const s = summary.data
    const csvData = {
      'Summary Metrics': {
        'Period Revenue': s?.periodRevenue,
        'Shop Revenue': s?.orderRevenue,
        'Ticket Revenue': s?.ticketRevenue,
        'Equipment Revenue': s?.equipmentRevenue,
        'Medal Revenue': s?.medalRevenue,
        'Total Orders': s?.totalOrders,
        'Payment Success Rate': `${s?.paymentSuccessRate}%`,
        'Total Users': userStats.data?.total,
        'Average Order Value': s?.avgOrderValue,
      },
      'Top Products': topProducts.data.map((p) => ({
        'Product Name': p.name,
        Revenue: p.revenue,
        'Quantity Sold': p.quantitySold,
        Category: p.category,
      })),
      'Top Events': topEvents.data.map((e) => ({
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
      `ANALYTICS REPORT - ${new Date().toLocaleDateString()}\n` +
      `Date Range: ${describeDateRange(dateRange)}\n\n` +
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
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'landscape' as const },
      }

      html2pdf.default().set(opt).from(element).save()
    })
  }

  const trends = summary.data?.trends
  const revenueSubtitle = summary.data
    ? `Shop ${summary.data.orderRevenue.toLocaleString()} · Tickets ${summary.data.ticketRevenue.toLocaleString()} · Hire ${summary.data.equipmentRevenue.toLocaleString()} · Medals ${summary.data.medalRevenue.toLocaleString()}`
    : undefined

  return (
    <div ref={reportRef} className="space-y-8">
      <AdminPageHeader
        title="Analytics"
        subtitle="Track your business performance and metrics"
        actions={
          <>
            <button
              onClick={exportToCSV}
              disabled={anyLoading}
              className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-green-700 transition disabled:opacity-50 w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={exportToPDF}
              disabled={anyLoading}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-blue-700 transition disabled:opacity-50 w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={fetchAnalytics}
              disabled={anyLoading}
              className="flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white dark:text-black px-4 py-2 min-h-[44px] rounded-lg hover:opacity-90 transition disabled:opacity-50 w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 ${anyLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </>
        }
      />

      <AnalyticsDateRange value={dateRange} onChange={setDateRange} />

      {summary.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400 text-sm">{summary.error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`KES ${summary.data?.totalRevenue?.toLocaleString() || 0}`}
          subtitle={revenueSubtitle}
          loading={summary.loading}
          trend={trends?.totalRevenue.trend}
          trendPercent={trends?.totalRevenue.trendPercent}
        />
        <MetricCard
          title="Period Revenue"
          value={`KES ${summary.data?.periodRevenue?.toLocaleString() || 0}`}
          subtitle={describeDateRange(dateRange)}
          loading={summary.loading}
          trend={trends?.periodRevenue.trend}
          trendPercent={trends?.periodRevenue.trendPercent}
        />
        <MetricCard
          title="Total Orders"
          value={summary.data?.totalOrders || 0}
          unit="orders"
          loading={summary.loading}
          trend={trends?.totalOrders.trend}
          trendPercent={trends?.totalOrders.trendPercent}
        />
        <MetricCard
          title="Payment Success Rate"
          value={`${summary.data?.paymentSuccessRate?.toFixed(1) || 0}%`}
          loading={summary.loading}
          trend={trends?.paymentSuccessRate.trend}
          trendPercent={trends?.paymentSuccessRate.trendPercent}
        />
        <MetricCard
          title="Total Users"
          value={userStats.data?.total || summary.data?.totalUsers || 0}
          unit="users"
          loading={userStats.loading || summary.loading}
        />
        <MetricCard
          title="Average Order Value"
          value={`KES ${summary.data?.avgOrderValue?.toFixed(0) || 0}`}
          loading={summary.loading}
          trend={trends?.avgOrderValue.trend}
          trendPercent={trends?.avgOrderValue.trendPercent}
        />
      </div>

      {(orderStats.data || orderStats.loading) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Completed Orders"
            value={orderStats.data?.completed || 0}
            loading={orderStats.loading}
          />
          <MetricCard
            title="Pending Orders"
            value={orderStats.data?.pending || 0}
            loading={orderStats.loading}
          />
          <MetricCard
            title="Avg Paid Order"
            value={`KES ${orderStats.data?.avgValue?.toFixed(0) || 0}`}
            loading={orderStats.loading}
          />
          <MetricCard
            title="Max Order"
            value={`KES ${orderStats.data?.maxValue?.toFixed(0) || 0}`}
            loading={orderStats.loading}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartPanel
          title="Revenue Trend (all sources)"
          loading={revenueTimeline.loading}
          error={revenueTimeline.error}
          empty={revenueTimeline.data.length === 0}
        >
          <RevenueChart data={revenueTimeline.data} />
        </ChartPanel>

        <ChartPanel
          title="Payment Status Distribution"
          loading={paymentStats.loading}
          error={paymentStats.error}
          empty={paymentStats.data.length === 0}
        >
          <PaymentDistribution data={paymentStats.data} />
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartPanel
          title="Top Products by Revenue"
          loading={topProducts.loading}
          error={topProducts.error}
          empty={topProducts.data.length === 0}
        >
          <TopProducts data={topProducts.data} />
        </ChartPanel>

        <ChartPanel
          title="Top Events by Tickets Sold"
          loading={topEvents.loading}
          error={topEvents.error}
          empty={topEvents.data.length === 0}
        >
          <TopEvents data={topEvents.data} />
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartPanel
          title="Revenue by Category"
          loading={categories.loading}
          error={categories.error}
          empty={categories.data.length === 0}
        >
          <CategoryRevenueChart data={categories.data} />
        </ChartPanel>

        <ChartPanel
          title="User Growth"
          loading={userGrowth.loading}
          error={userGrowth.error}
          empty={userGrowth.data.length === 0}
        >
          <UserGrowthChart data={userGrowth.data} />
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartPanel
          title="Payment Timeline"
          loading={paymentTimeline.loading}
          error={paymentTimeline.error}
          empty={paymentTimeline.data.length === 0}
        >
          <PaymentTimelineChart data={paymentTimeline.data} />
        </ChartPanel>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Event Attendance</h3>
          {attendance.loading ? (
            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center">
              <Loader className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : attendance.error ? (
            <div className="h-64 flex items-center justify-center text-red-600 dark:text-red-400 text-sm">
              {attendance.error}
            </div>
          ) : attendance.data.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>No attendance data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b dark:border-gray-600">
                  <tr>
                    <th className="text-left py-2 text-gray-900 dark:text-gray-100">Event</th>
                    <th className="text-right py-2 text-gray-900 dark:text-gray-100">Sold</th>
                    <th className="text-right py-2 text-gray-900 dark:text-gray-100">Capacity</th>
                    <th className="text-right py-2 text-gray-900 dark:text-gray-100">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.data.slice(0, 8).map((e) => (
                    <tr key={e.id} className="border-b dark:border-gray-700">
                      <td className="py-2 text-gray-900 dark:text-gray-100">{e.name}</td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-300">{e.ticketsSold}</td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-300">{e.capacity}</td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-300">{e.utilization}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
