import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Loader, AlertCircle, Download, Trash2, Plus } from 'lucide-react';
import Papa from 'papaparse';
import { getAnalyticsSummary, getRevenueTimeline, getPaymentStats, getTopProducts, getTopEvents, getUserStats, getOrderStats, getRevenueByCategory, getUserGrowth, getPaymentTimeline, getEventAttendance, } from '../api/analytics';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import AdminMobileCard, { AdminMobileCardRow } from '../components/admin/AdminMobileCard';
import AdminResponsiveData from '../components/admin/AdminResponsiveData';
import AnalyticsDateRange, { describeDateRange, toAnalyticsParams, } from '../components/admin/AnalyticsDateRange';
const DEFAULT_METRICS = {
    summary: true,
    revenue: true,
    payments: true,
    products: true,
    events: true,
    users: true,
    orders: true,
    category: false,
    userGrowth: false,
    paymentTimeline: false,
    attendance: false,
};
const METRIC_LABELS = {
    summary: 'Summary Metrics',
    revenue: 'Revenue Timeline',
    payments: 'Payment Stats',
    products: 'Top Products',
    events: 'Top Events',
    users: 'User Stats',
    orders: 'Order Stats',
    category: 'Revenue by Category',
    userGrowth: 'User Growth',
    paymentTimeline: 'Payment Timeline',
    attendance: 'Event Attendance',
};
function normalizeMetrics(raw) {
    return { ...DEFAULT_METRICS, ...raw };
}
function normalizeDateRange(raw) {
    if (raw && typeof raw === 'object' && raw.mode === 'custom' && raw.startDate && raw.endDate) {
        return { mode: 'custom', startDate: raw.startDate, endDate: raw.endDate };
    }
    if (raw && typeof raw === 'object' && raw.mode === 'preset' && raw.days) {
        return { mode: 'preset', days: raw.days };
    }
    if (raw === '7' || raw === '30' || raw === '90') {
        return { mode: 'preset', days: raw };
    }
    return { mode: 'preset', days: '30' };
}
export default function AdminReports() {
    const [reports, setReports] = useState([]);
    const [selectedMetrics, setSelectedMetrics] = useState({ ...DEFAULT_METRICS });
    const [dateRange, setDateRange] = useState({ mode: 'preset', days: '30' });
    const [reportName, setReportName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        loadReports();
    }, []);
    const loadReports = () => {
        const saved = localStorage.getItem('savedReports');
        if (!saved)
            return;
        try {
            const parsed = JSON.parse(saved);
            setReports(parsed.map((r) => ({
                id: r.id,
                name: r.name,
                metrics: normalizeMetrics(r.metrics),
                dateRange: normalizeDateRange(r.dateRange),
                createdAt: r.createdAt,
            })));
        }
        catch {
            setReports([]);
        }
    };
    const saveReport = () => {
        if (!reportName.trim()) {
            setError('Please enter a report name');
            return;
        }
        const newReport = {
            id: Date.now().toString(),
            name: reportName,
            metrics: selectedMetrics,
            dateRange,
            createdAt: new Date().toISOString(),
        };
        const updated = [...reports, newReport];
        setReports(updated);
        localStorage.setItem('savedReports', JSON.stringify(updated));
        setReportName('');
        setError('');
    };
    const generateReport = async (config) => {
        try {
            setLoading(true);
            setError('');
            const metrics = normalizeMetrics(config?.metrics || selectedMetrics);
            const range = normalizeDateRange(config?.dateRange || dateRange);
            const params = toAnalyticsParams(range);
            const reportData = {};
            if (metrics.summary)
                reportData.summary = await getAnalyticsSummary(params);
            if (metrics.revenue)
                reportData.revenue = await getRevenueTimeline(params);
            if (metrics.payments)
                reportData.payments = await getPaymentStats(params);
            if (metrics.products)
                reportData.products = await getTopProducts({ ...params, limit: 10 });
            if (metrics.events)
                reportData.events = await getTopEvents({ ...params, limit: 5 });
            if (metrics.users)
                reportData.users = await getUserStats(params);
            if (metrics.orders)
                reportData.orders = await getOrderStats(params);
            if (metrics.category)
                reportData.category = await getRevenueByCategory(params);
            if (metrics.userGrowth)
                reportData.userGrowth = await getUserGrowth(params);
            if (metrics.paymentTimeline)
                reportData.paymentTimeline = await getPaymentTimeline(params);
            if (metrics.attendance)
                reportData.attendance = await getEventAttendance(params);
            downloadCSV(reportData, config?.name || 'custom-report', range);
        }
        catch (err) {
            console.error('Error generating report:', err);
            setError('Failed to generate report');
        }
        finally {
            setLoading(false);
        }
    };
    const downloadCSV = (reportData, name, range) => {
        const rows = [];
        rows.push([`Report: ${name}`]);
        rows.push([`Generated: ${new Date().toLocaleString()}`]);
        rows.push([`Date Range: ${describeDateRange(range)}`]);
        rows.push([]);
        if (reportData.summary) {
            rows.push(['SUMMARY METRICS']);
            Object.entries(reportData.summary).forEach(([key, value]) => {
                if (key === 'trends')
                    return;
                rows.push([key, typeof value === 'object' ? JSON.stringify(value) : value]);
            });
            rows.push([]);
        }
        if (reportData.revenue) {
            rows.push(['REVENUE TIMELINE']);
            rows.push(['Date', 'Revenue', 'Transactions', 'Shop', 'Tickets', 'Hire', 'Medals']);
            reportData.revenue.forEach((row) => {
                rows.push([
                    row.date,
                    row.revenue,
                    row.transactions,
                    row.bySource?.shop,
                    row.bySource?.tickets,
                    row.bySource?.hire,
                    row.bySource?.medals,
                ]);
            });
            rows.push([]);
        }
        if (reportData.payments) {
            rows.push(['PAYMENT STATISTICS']);
            Object.entries(reportData.payments).forEach(([key, value]) => {
                if (key === 'breakdown')
                    return;
                rows.push([key, value]);
            });
            rows.push([]);
        }
        if (reportData.products) {
            rows.push(['TOP PRODUCTS']);
            rows.push(['Product Name', 'Revenue', 'Quantity Sold', 'Category']);
            reportData.products.forEach((p) => {
                rows.push([p.name, p.revenue, p.quantitySold, p.category]);
            });
            rows.push([]);
        }
        if (reportData.events) {
            rows.push(['TOP EVENTS']);
            rows.push(['Event Name', 'Tickets Sold', 'Capacity', 'Utilization', 'Revenue']);
            reportData.events.forEach((e) => {
                rows.push([e.name, e.ticketsSold, e.capacity, e.utilization, e.revenue]);
            });
            rows.push([]);
        }
        if (reportData.users) {
            rows.push(['USER STATISTICS']);
            Object.entries(reportData.users).forEach(([key, value]) => {
                rows.push([key, typeof value === 'object' ? JSON.stringify(value) : value]);
            });
            rows.push([]);
        }
        if (reportData.orders) {
            rows.push(['ORDER STATISTICS']);
            Object.entries(reportData.orders).forEach(([key, value]) => {
                rows.push([key, value]);
            });
            rows.push([]);
        }
        if (reportData.category) {
            rows.push(['REVENUE BY CATEGORY']);
            rows.push(['Category', 'Revenue', 'Items Sold', 'Orders']);
            reportData.category.forEach((c) => {
                rows.push([c.category, c.revenue, c.itemsSold, c.orders]);
            });
            rows.push([]);
        }
        if (reportData.userGrowth) {
            rows.push(['USER GROWTH']);
            rows.push(['Date', 'New Users', 'Cumulative']);
            reportData.userGrowth.forEach((r) => {
                rows.push([r.date, r.newUsers, r.cumulative]);
            });
            rows.push([]);
        }
        if (reportData.paymentTimeline) {
            rows.push(['PAYMENT TIMELINE']);
            rows.push(['Date', 'Total', 'Successful', 'Pending', 'Failed']);
            reportData.paymentTimeline.forEach((r) => {
                rows.push([r.date, r.total, r.successful, r.pending, r.failed]);
            });
            rows.push([]);
        }
        if (reportData.attendance) {
            rows.push(['EVENT ATTENDANCE']);
            rows.push(['Event', 'Tickets Sold', 'Capacity', 'Utilization']);
            reportData.attendance.forEach((e) => {
                rows.push([e.name, e.ticketsSold, e.capacity, e.utilization]);
            });
            rows.push([]);
        }
        const csv = Papa.unparse(rows);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };
    const deleteReport = (id) => {
        const updated = reports.filter((r) => r.id !== id);
        setReports(updated);
        localStorage.setItem('savedReports', JSON.stringify(updated));
    };
    const metricCount = Object.keys(METRIC_LABELS).length;
    return (_jsxs("div", { className: "space-y-8", children: [_jsx(AdminPageHeader, { title: "Reports", subtitle: "Create and manage custom analytics reports" }), error && (_jsxs("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" }), _jsx("p", { className: "text-red-700 dark:text-red-400", children: error })] })), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6", children: [_jsx("h2", { className: "text-2xl font-bold mb-6 text-gray-900 dark:text-white", children: "Create New Report" }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100", children: "Report Name" }), _jsx("input", { type: "text", value: reportName, onChange: (e) => setReportName(e.target.value), placeholder: "e.g., Monthly Revenue Report", className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white" })] }), _jsx("div", { className: "mb-6", children: _jsx(AnalyticsDateRange, { value: dateRange, onChange: setDateRange }) }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100", children: "Metrics to Include" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: Object.keys(METRIC_LABELS).map((key) => (_jsxs("label", { className: "flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: selectedMetrics[key], onChange: (e) => setSelectedMetrics({
                                                ...selectedMetrics,
                                                [key]: e.target.checked,
                                            }), className: "w-4 h-4 rounded" }), _jsx("span", { className: "text-sm font-medium text-gray-900 dark:text-gray-100", children: METRIC_LABELS[key] })] }, key))) })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3", children: [_jsxs("button", { onClick: () => generateReport(), disabled: loading, className: "flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2 min-h-[44px] rounded-lg hover:bg-blue-700 transition disabled:opacity-50 w-full sm:w-auto", children: [loading ? _jsx(Loader, { className: "w-4 h-4 animate-spin" }) : _jsx(Download, { className: "w-4 h-4" }), "Generate & Download"] }), _jsxs("button", { onClick: saveReport, disabled: loading, className: "flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-2 min-h-[44px] rounded-lg hover:bg-green-700 transition disabled:opacity-50 w-full sm:w-auto", children: [_jsx(Plus, { className: "w-4 h-4" }), "Save Report Template"] })] }), _jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400 mt-4", children: "Templates are saved in this browser only." })] }), reports.length > 0 && (_jsxs("div", { children: [_jsx("h2", { className: "text-xl sm:text-2xl font-bold mb-6 text-gray-900 dark:text-white", children: "Saved Report Templates" }), _jsx(AdminResponsiveData, { desktop: _jsxs("table", { className: "w-full text-sm min-w-[560px]", children: [_jsx("thead", { className: "bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-4 py-3 font-semibold text-gray-900 dark:text-gray-100", children: "Report Name" }), _jsx("th", { className: "text-left px-4 py-3 font-semibold text-gray-900 dark:text-gray-100", children: "Created" }), _jsx("th", { className: "text-left px-4 py-3 font-semibold text-gray-900 dark:text-gray-100", children: "Date Range" }), _jsx("th", { className: "text-left px-4 py-3 font-semibold text-gray-900 dark:text-gray-100", children: "Metrics" }), _jsx("th", { className: "text-right px-4 py-3 font-semibold text-gray-900 dark:text-gray-100", children: "Actions" })] }) }), _jsx("tbody", { children: reports.map((report) => (_jsxs("tr", { className: "border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50", children: [_jsx("td", { className: "px-4 py-3 font-medium text-gray-900 dark:text-gray-100", children: report.name }), _jsx("td", { className: "px-4 py-3 text-gray-600 dark:text-gray-400", children: new Date(report.createdAt).toLocaleDateString() }), _jsx("td", { className: "px-4 py-3 text-gray-600 dark:text-gray-400", children: describeDateRange(report.dateRange) }), _jsxs("td", { className: "px-4 py-3 text-gray-600 dark:text-gray-400", children: [Object.values(report.metrics).filter(Boolean).length, "/", metricCount] }), _jsx("td", { className: "text-right px-4 py-3", children: _jsxs("div", { className: "flex gap-2 justify-end", children: [_jsx("button", { onClick: () => generateReport(report), disabled: loading, className: "text-blue-600 dark:text-blue-400 hover:text-blue-700 disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center", children: _jsx(Download, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => deleteReport(report.id), className: "text-red-600 dark:text-red-400 hover:text-red-700 min-h-[44px] min-w-[44px] flex items-center justify-center", children: _jsx(Trash2, { className: "w-4 h-4" }) })] }) })] }, report.id))) })] }), mobile: reports.map((report) => (_jsxs(AdminMobileCard, { footer: _jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => generateReport(report), disabled: loading, className: "flex items-center gap-2 text-blue-600 dark:text-blue-400 disabled:opacity-50 min-h-[44px] px-3", children: [_jsx(Download, { className: "w-4 h-4" }), " Download"] }), _jsxs("button", { onClick: () => deleteReport(report.id), className: "flex items-center gap-2 text-red-600 dark:text-red-400 min-h-[44px] px-3", children: [_jsx(Trash2, { className: "w-4 h-4" }), " Delete"] })] }), children: [_jsx("p", { className: "font-semibold text-gray-900 dark:text-white", children: report.name }), _jsx(AdminMobileCardRow, { label: "Created", value: new Date(report.createdAt).toLocaleDateString() }), _jsx(AdminMobileCardRow, { label: "Date range", value: describeDateRange(report.dateRange) }), _jsx(AdminMobileCardRow, { label: "Metrics", value: `${Object.values(report.metrics).filter(Boolean).length}/${metricCount}` })] }, report.id))) })] }))] }));
}
//# sourceMappingURL=AdminReports.js.map