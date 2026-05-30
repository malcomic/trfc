import { useEffect, useState } from 'react'
import { Loader, AlertCircle, Download, Trash2, Plus } from 'lucide-react'
import Papa from 'papaparse'
import {
  getAnalyticsSummary,
  getRevenueTimeline,
  getPaymentStats,
  getTopProducts,
  getTopEvents,
  getUserStats,
  getOrderStats,
} from '../api/analytics'

interface ReportConfig {
  id: string
  name: string
  metrics: {
    summary: boolean
    revenue: boolean
    payments: boolean
    products: boolean
    events: boolean
    users: boolean
    orders: boolean
  }
  dateRange: '7' | '30' | '90'
  createdAt: string
}

export default function AdminReports() {
  const [reports, setReports] = useState<ReportConfig[]>([])
  const [selectedMetrics, setSelectedMetrics] = useState({
    summary: true,
    revenue: true,
    payments: true,
    products: true,
    events: true,
    users: true,
    orders: true,
  })
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30')
  const [reportName, setReportName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = () => {
    const saved = localStorage.getItem('savedReports')
    if (saved) {
      setReports(JSON.parse(saved))
    }
  }

  const saveReport = () => {
    if (!reportName.trim()) {
      setError('Please enter a report name')
      return
    }

    const newReport: ReportConfig = {
      id: Date.now().toString(),
      name: reportName,
      metrics: selectedMetrics,
      dateRange,
      createdAt: new Date().toISOString(),
    }

    const updated = [...reports, newReport]
    setReports(updated)
    localStorage.setItem('savedReports', JSON.stringify(updated))
    setReportName('')
    setError('')
  }

  const generateReport = async (config?: ReportConfig) => {
    try {
      setLoading(true)
      setError('')

      const metrics = config?.metrics || selectedMetrics
      const range = config?.dateRange || dateRange

      const reportData: any = {}

      if (metrics.summary) {
        reportData.summary = await getAnalyticsSummary()
      }
      if (metrics.revenue) {
        reportData.revenue = await getRevenueTimeline({ days: range })
      }
      if (metrics.payments) {
        reportData.payments = await getPaymentStats()
      }
      if (metrics.products) {
        reportData.products = await getTopProducts({ limit: 10 })
      }
      if (metrics.events) {
        reportData.events = await getTopEvents({ limit: 5 })
      }
      if (metrics.users) {
        reportData.users = await getUserStats()
      }
      if (metrics.orders) {
        reportData.orders = await getOrderStats()
      }

      downloadCSV(reportData, config?.name || 'custom-report')
    } catch (err: any) {
      console.error('Error generating report:', err)
      setError('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const downloadCSV = (reportData: any, name: string) => {
    const rows: any[] = []

    rows.push([`Report: ${name}`])
    rows.push([`Generated: ${new Date().toLocaleString()}`])
    rows.push([])

    if (reportData.summary) {
      rows.push(['SUMMARY METRICS'])
      Object.entries(reportData.summary).forEach(([key, value]) => {
        rows.push([key, value])
      })
      rows.push([])
    }

    if (reportData.revenue) {
      rows.push(['REVENUE TIMELINE'])
      rows.push(['Date', 'Revenue', 'Orders'])
      reportData.revenue.forEach((row: any) => {
        rows.push([row.date, row.revenue, row.orders])
      })
      rows.push([])
    }

    if (reportData.payments) {
      rows.push(['PAYMENT STATISTICS'])
      Object.entries(reportData.payments).forEach(([key, value]) => {
        rows.push([key, value])
      })
      rows.push([])
    }

    if (reportData.products) {
      rows.push(['TOP PRODUCTS'])
      rows.push(['Product Name', 'Revenue', 'Quantity Sold', 'Category'])
      reportData.products.forEach((p: any) => {
        rows.push([p.name, p.revenue, p.quantitySold, p.category])
      })
      rows.push([])
    }

    if (reportData.events) {
      rows.push(['TOP EVENTS'])
      rows.push(['Event Name', 'Tickets Sold', 'Capacity', 'Utilization'])
      reportData.events.forEach((e: any) => {
        rows.push([e.name, e.ticketsSold, e.capacity, e.utilization])
      })
      rows.push([])
    }

    if (reportData.users) {
      rows.push(['USER STATISTICS'])
      Object.entries(reportData.users).forEach(([key, value]) => {
        rows.push([key, value])
      })
      rows.push([])
    }

    if (reportData.orders) {
      rows.push(['ORDER STATISTICS'])
      Object.entries(reportData.orders).forEach(([key, value]) => {
        rows.push([key, value])
      })
      rows.push([])
    }

    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const deleteReport = (id: string) => {
    const updated = reports.filter((r) => r.id !== id)
    setReports(updated)
    localStorage.setItem('savedReports', JSON.stringify(updated))
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2 text-gray-800 dark:text-white">Reports</h1>
        <p className="text-gray-600 dark:text-gray-400">Create and manage custom analytics reports</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Create New Report</h2>

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Report Name</label>
          <input
            type="text"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            placeholder="e.g., Monthly Revenue Report"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="mb-6">
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

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100">Metrics to Include</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(selectedMetrics).map(([key, checked]) => (
              <label
                key={key}
                className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    setSelectedMetrics({
                      ...selectedMetrics,
                      [key]: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="capitalize text-sm font-medium text-gray-900 dark:text-gray-100">
                  {key === 'summary' && 'Summary Metrics'}
                  {key === 'revenue' && 'Revenue Timeline'}
                  {key === 'payments' && 'Payment Stats'}
                  {key === 'products' && 'Top Products'}
                  {key === 'events' && 'Top Events'}
                  {key === 'users' && 'User Stats'}
                  {key === 'orders' && 'Order Stats'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => generateReport()}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Generate & Download
          </button>
          <button
            onClick={saveReport}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Save Report Template
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          Templates are saved in this browser only.
        </p>
      </div>

      {reports.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Saved Report Templates</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Report Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Created</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Date Range</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Metrics</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{report.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Last {report.dateRange} days</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {Object.values(report.metrics).filter(Boolean).length}/7
                    </td>
                    <td className="text-right px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => generateReport(report)}
                          disabled={loading}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 disabled:opacity-50"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
