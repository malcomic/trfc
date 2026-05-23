import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Loader, AlertCircle, RefreshCw, Download } from 'lucide-react';
import Papa from 'papaparse';
import AdminLayout from '../components/AdminLayout';
import MetricCard from '../components/MetricCard';
import RevenueChart from '../components/charts/RevenueChart';
import PaymentDistribution from '../components/charts/PaymentDistribution';
import TopProducts from '../components/charts/TopProducts';
import TopEvents from '../components/charts/TopEvents';
import { getAnalyticsSummary, getRevenueTimeline, getPaymentStats, getTopProducts, getTopEvents, getUserStats, getOrderStats } from '../api/analytics';
export default function AdminAnalytics() {
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
            // Transform payment stats to array format for pie chart
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
                'Revenue': p.revenue,
                'Quantity Sold': p.quantitySold,
                'Category': p.category,
            })),
            'Top Events': data.topEvents.map((e) => ({
                'Event Name': e.name,
                'Tickets Sold': e.ticketsSold,
                'Capacity': e.capacity,
                'Utilization': e.utilization,
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
        const element = document.getElementById('analytics-report');
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
        return (_jsx(AdminLayout, { children: _jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6 flex gap-3", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-red-900 font-semibold mb-2", children: "Error Loading Analytics" }), _jsx("p", { className: "text-red-700 text-sm mb-4", children: error }), _jsx("button", { onClick: fetchAnalytics, className: "bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition", children: "Try Again" })] })] }) }));
    }
    return (_jsx(AdminLayout, { children: _jsxs("div", { className: "space-y-8", children: [_jsxs("div", { className: "flex justify-between items-center mb-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-4xl font-bold mb-2", children: "Analytics Dashboard" }), _jsx("p", { className: "text-gray-600", children: "Track your business performance and metrics" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: exportToCSV, disabled: loading, className: "flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50", children: [_jsx(Download, { className: "w-4 h-4" }), "CSV"] }), _jsxs("button", { onClick: exportToPDF, disabled: loading, className: "flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50", children: [_jsx(Download, { className: "w-4 h-4" }), "PDF"] }), _jsxs("button", { onClick: fetchAnalytics, disabled: loading, className: "flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50", children: [_jsx(RefreshCw, { className: `w-4 h-4 ${loading ? 'animate-spin' : ''}` }), "Refresh"] })] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-4", children: [_jsx("label", { className: "block text-sm font-semibold mb-3", children: "Date Range" }), _jsx("div", { className: "flex gap-3", children: ['7', '30', '90'].map((range) => (_jsxs("button", { onClick: () => setDateRange(range), className: `px-4 py-2 rounded transition ${dateRange === range
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`, children: ["Last ", range, " days"] }, range))) })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: [_jsx(MetricCard, { title: "Total Revenue", value: `KES ${data.summary?.totalRevenue?.toLocaleString() || 0}`, unit: "", trend: "up", trendPercent: 8.5, loading: loading }), _jsx(MetricCard, { title: "This Month Revenue", value: `KES ${data.summary?.thisMonthRevenue?.toLocaleString() || 0}`, unit: "", trend: "up", trendPercent: 12.3, loading: loading }), _jsx(MetricCard, { title: "Total Orders", value: data.summary?.totalOrders || 0, unit: "orders", trend: "up", trendPercent: 5.2, loading: loading }), _jsx(MetricCard, { title: "Payment Success Rate", value: `${data.summary?.paymentSuccessRate?.toFixed(1) || 0}%`, unit: "", trend: "up", trendPercent: 3.1, loading: loading }), _jsx(MetricCard, { title: "Active Users", value: data.userStats?.total || 0, unit: "users", trend: "up", trendPercent: 6.8, loading: loading }), _jsx(MetricCard, { title: "Average Order Value", value: `KES ${data.summary?.avgOrderValue?.toFixed(0) || 0}`, unit: "", trend: "neutral", loading: loading })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Revenue Trend" }), loading ? (_jsx("div", { className: "h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center", children: _jsx(Loader, { className: "w-8 h-8 text-gray-400 animate-spin" }) })) : data.revenueTimeline.length > 0 ? (_jsx(RevenueChart, { data: data.revenueTimeline })) : (_jsx("div", { className: "h-64 flex items-center justify-center text-gray-500", children: _jsx("p", { children: "No revenue data available" }) }))] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Payment Status Distribution" }), loading ? (_jsx("div", { className: "h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center", children: _jsx(Loader, { className: "w-8 h-8 text-gray-400 animate-spin" }) })) : data.paymentStats && data.paymentStats.length > 0 ? (_jsx(PaymentDistribution, { data: data.paymentStats })) : (_jsx("div", { className: "h-64 flex items-center justify-center text-gray-500", children: _jsx("p", { children: "No payment data available" }) }))] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Top Products by Revenue" }), loading ? (_jsx("div", { className: "h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center", children: _jsx(Loader, { className: "w-8 h-8 text-gray-400 animate-spin" }) })) : data.topProducts.length > 0 ? (_jsx(TopProducts, { data: data.topProducts })) : (_jsx("div", { className: "h-64 flex items-center justify-center text-gray-500", children: _jsx("p", { children: "No product data available" }) }))] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Top Events by Tickets Sold" }), loading ? (_jsx("div", { className: "h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center", children: _jsx(Loader, { className: "w-8 h-8 text-gray-400 animate-spin" }) })) : data.topEvents.length > 0 ? (_jsx(TopEvents, { data: data.topEvents })) : (_jsx("div", { className: "h-64 flex items-center justify-center text-gray-500", children: _jsx("p", { children: "No event data available" }) }))] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-6", children: "Summary Statistics" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsxs("div", { className: "p-4 bg-blue-50 rounded-lg", children: [_jsx("p", { className: "text-sm text-gray-600 mb-1", children: "Total Orders" }), _jsx("p", { className: "text-2xl font-bold text-blue-600", children: data.orderStats?.total || 0 }), _jsxs("p", { className: "text-xs text-gray-500 mt-2", children: [data.orderStats?.completed || 0, " completed"] })] }), _jsxs("div", { className: "p-4 bg-green-50 rounded-lg", children: [_jsx("p", { className: "text-sm text-gray-600 mb-1", children: "Avg Order Value" }), _jsxs("p", { className: "text-2xl font-bold text-green-600", children: ["KES ", data.summary?.avgOrderValue?.toFixed(0) || 0] })] }), _jsxs("div", { className: "p-4 bg-purple-50 rounded-lg", children: [_jsx("p", { className: "text-sm text-gray-600 mb-1", children: "Success Rate" }), _jsxs("p", { className: "text-2xl font-bold text-purple-600", children: [data.summary?.paymentSuccessRate?.toFixed(1) || 0, "%"] })] }), _jsxs("div", { className: "p-4 bg-orange-50 rounded-lg", children: [_jsx("p", { className: "text-sm text-gray-600 mb-1", children: "Total Users" }), _jsx("p", { className: "text-2xl font-bold text-orange-600", children: data.userStats?.total || 0 })] })] })] })] }) }));
}
//# sourceMappingURL=AdminAnalytics.js.map