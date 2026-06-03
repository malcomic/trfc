import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Loader, AlertCircle, RefreshCw, Download } from 'lucide-react';
import Papa from 'papaparse';
import MetricCard from '../components/MetricCard';
import RevenueChart from '../components/charts/RevenueChart';
import PaymentDistribution from '../components/charts/PaymentDistribution';
import TopProducts from '../components/charts/TopProducts';
import TopEvents from '../components/charts/TopEvents';
import { getAnalyticsSummary, getRevenueTimeline, getPaymentStats, getTopProducts, getTopEvents, getUserStats, getOrderStats, } from '../api/analytics';
import AdminPageHeader from '../components/admin/AdminPageHeader';
export default function AdminAnalytics() {
    const reportRef = useRef(null);
    const [data, setData] = useState({
        summary: null,
        revenueTimeline: [],
        paymentStats: [],
        topProducts: [],
        topEvents: [],
        userStats: null,
        orderStats: null,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dateRange, setDateRange] = useState('30');
    useEffect(() => {
        fetchAnalytics();
    }, [dateRange]);
    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError('');
            const [summary, timeline, payments, products, events, users, orders] = await Promise.all([
                getAnalyticsSummary(),
                getRevenueTimeline({ days: dateRange }),
                getPaymentStats(),
                getTopProducts({ limit: 10 }),
                getTopEvents({ limit: 5 }),
                getUserStats(),
                getOrderStats(),
            ]);
            const paymentStatsArray = [
                { payment_status: 'paid', count: payments.successful },
                { payment_status: 'pending', count: payments.pending },
                { payment_status: 'failed', count: payments.failed },
            ];
            setData({
                summary,
                revenueTimeline: timeline,
                paymentStats: paymentStatsArray,
                topProducts: products,
                topEvents: events,
                userStats: users,
                orderStats: orders,
            });
        }
        catch (err) {
            console.error('Error fetching analytics:', err);
            setError(err.response?.data?.error || 'Failed to load analytics data');
        }
        finally {
            setLoading(false);
        }
    };
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
            'Top Products': data.topProducts.map((p) => ({
                'Product Name': p.name,
                Revenue: p.revenue,
                'Quantity Sold': p.quantitySold,
                Category: p.category,
            })),
            'Top Events': data.topEvents.map((e) => ({
                'Event Name': e.name,
                'Tickets Sold': e.ticketsSold,
                Capacity: e.capacity,
                Utilization: e.utilization,
            })),
        };
        const summaryCSV = Papa.unparse([csvData['Summary Metrics']]);
        const productsCSV = Papa.unparse(csvData['Top Products']);
        const eventsCSV = Papa.unparse(csvData['Top Events']);
        const fullCSV = `ANALYTICS REPORT - ${new Date().toLocaleDateString()}\n\n` +
            `SUMMARY METRICS\n${summaryCSV}\n\n` +
            `TOP PRODUCTS\n${productsCSV}\n\n` +
            `TOP EVENTS\n${eventsCSV}`;
        const blob = new Blob([fullCSV], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };
    const exportToPDF = () => {
        const element = reportRef.current;
        if (!element)
            return;
        import('html2pdf.js').then((html2pdf) => {
            const opt = {
                margin: 10,
                filename: `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { orientation: 'landscape' },
            };
            html2pdf.default().set(opt).from(element).save();
        });
    };
    if (error) {
        return (_jsxs("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex gap-3", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-red-900 dark:text-red-300 font-semibold mb-2", children: "Error Loading Analytics" }), _jsx("p", { className: "text-red-700 dark:text-red-400 text-sm mb-4", children: error }), _jsx("button", { onClick: fetchAnalytics, className: "bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition", children: "Try Again" })] })] }));
    }
    return (_jsxs("div", { ref: reportRef, className: "space-y-8", children: [_jsx(AdminPageHeader, { title: "Analytics", subtitle: "Track your business performance and metrics", actions: _jsxs(_Fragment, { children: [_jsxs("button", { onClick: exportToCSV, disabled: loading, className: "flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-green-700 transition disabled:opacity-50 w-full sm:w-auto", children: [_jsx(Download, { className: "w-4 h-4" }), "CSV"] }), _jsxs("button", { onClick: exportToPDF, disabled: loading, className: "flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-blue-700 transition disabled:opacity-50 w-full sm:w-auto", children: [_jsx(Download, { className: "w-4 h-4" }), "PDF"] }), _jsxs("button", { onClick: fetchAnalytics, disabled: loading, className: "flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white px-4 py-2 min-h-[44px] rounded-lg hover:opacity-90 transition disabled:opacity-50 w-full sm:w-auto", children: [_jsx(RefreshCw, { className: `w-4 h-4 ${loading ? 'animate-spin' : ''}` }), "Refresh"] })] }) }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-4", children: [_jsx("label", { className: "block text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100", children: "Date Range" }), _jsx("div", { className: "flex flex-wrap gap-3", children: ['7', '30', '90'].map((range) => (_jsxs("button", { onClick: () => setDateRange(range), className: `px-4 py-2 rounded transition ${dateRange === range
                                ? 'bg-primary dark:bg-primary-dark text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`, children: ["Last ", range, " days"] }, range))) })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: [_jsx(MetricCard, { title: "Total Revenue", value: `KES ${data.summary?.totalRevenue?.toLocaleString() || 0}`, loading: loading }), _jsx(MetricCard, { title: "This Month Revenue", value: `KES ${data.summary?.thisMonthRevenue?.toLocaleString() || 0}`, loading: loading }), _jsx(MetricCard, { title: "Total Orders", value: data.summary?.totalOrders || 0, unit: "orders", loading: loading }), _jsx(MetricCard, { title: "Payment Success Rate", value: `${data.summary?.paymentSuccessRate?.toFixed(1) || 0}%`, loading: loading }), _jsx(MetricCard, { title: "Active Users", value: data.userStats?.total || 0, unit: "users", loading: loading }), _jsx(MetricCard, { title: "Average Order Value", value: `KES ${data.summary?.avgOrderValue?.toFixed(0) || 0}`, loading: loading })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4 text-gray-900 dark:text-white", children: "Revenue Trend" }), loading ? (_jsx("div", { className: "h-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center", children: _jsx(Loader, { className: "w-8 h-8 text-gray-400 animate-spin" }) })) : data.revenueTimeline.length > 0 ? (_jsx(RevenueChart, { data: data.revenueTimeline })) : (_jsx("div", { className: "h-64 flex items-center justify-center text-gray-500 dark:text-gray-400", children: _jsx("p", { children: "No revenue data available" }) }))] }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4 text-gray-900 dark:text-white", children: "Payment Status Distribution" }), loading ? (_jsx("div", { className: "h-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center", children: _jsx(Loader, { className: "w-8 h-8 text-gray-400 animate-spin" }) })) : data.paymentStats && data.paymentStats.length > 0 ? (_jsx(PaymentDistribution, { data: data.paymentStats })) : (_jsx("div", { className: "h-64 flex items-center justify-center text-gray-500 dark:text-gray-400", children: _jsx("p", { children: "No payment data available" }) }))] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4 text-gray-900 dark:text-white", children: "Top Products by Revenue" }), loading ? (_jsx("div", { className: "h-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center", children: _jsx(Loader, { className: "w-8 h-8 text-gray-400 animate-spin" }) })) : data.topProducts.length > 0 ? (_jsx(TopProducts, { data: data.topProducts })) : (_jsx("div", { className: "h-64 flex items-center justify-center text-gray-500 dark:text-gray-400", children: _jsx("p", { children: "No product data available" }) }))] }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4 text-gray-900 dark:text-white", children: "Top Events by Tickets Sold" }), loading ? (_jsx("div", { className: "h-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center", children: _jsx(Loader, { className: "w-8 h-8 text-gray-400 animate-spin" }) })) : data.topEvents.length > 0 ? (_jsx(TopEvents, { data: data.topEvents })) : (_jsx("div", { className: "h-64 flex items-center justify-center text-gray-500 dark:text-gray-400", children: _jsx("p", { children: "No event data available" }) }))] })] })] }));
}
//# sourceMappingURL=AdminAnalytics.js.map