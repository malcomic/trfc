import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Loader, AlertCircle, Download, Trash2, Plus } from 'lucide-react';
import Papa from 'papaparse';
import { getAnalyticsSummary, getRevenueTimeline, getPaymentStats, getTopProducts, getTopEvents, getUserStats, getOrderStats, } from '../api/analytics';
export default function AdminReports() {
    const [reports, setReports] = useState([]);
    const [selectedMetrics, setSelectedMetrics] = useState({
        summary: true,
        revenue: true,
        payments: true,
        products: true,
        events: true,
        users: true,
        orders: true,
    });
    const [dateRange, setDateRange] = useState('30');
    const [reportName, setReportName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        loadReports();
    }, []);
    const loadReports = () => {
        const saved = localStorage.getItem('savedReports');
        if (saved) {
            setReports(JSON.parse(saved));
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
            const metrics = config?.metrics || selectedMetrics;
            const range = config?.dateRange || dateRange;
            const reportData = {};
            if (metrics.summary) {
                reportData.summary = await getAnalyticsSummary();
            }
            if (metrics.revenue) {
                reportData.revenue = await getRevenueTimeline({ days: range });
            }
            if (metrics.payments) {
                reportData.payments = await getPaymentStats();
            }
            if (metrics.products) {
                reportData.products = await getTopProducts({ limit: 10 });
            }
            if (metrics.events) {
                reportData.events = await getTopEvents({ limit: 5 });
            }
            if (metrics.users) {
                reportData.users = await getUserStats();
            }
            if (metrics.orders) {
                reportData.orders = await getOrderStats();
            }
            downloadCSV(reportData, config?.name || 'custom-report');
        }
        catch (err) {
            console.error('Error generating report:', err);
            setError('Failed to generate report');
        }
        finally {
            setLoading(false);
        }
    };
    const downloadCSV = (reportData, name) => {
        const rows = [];
        rows.push([`Report: ${name}`]);
        rows.push([`Generated: ${new Date().toLocaleString()}`]);
        rows.push([]);
        if (reportData.summary) {
            rows.push(['SUMMARY METRICS']);
            Object.entries(reportData.summary).forEach(([key, value]) => {
                rows.push([key, value]);
            });
            rows.push([]);
        }
        if (reportData.revenue) {
            rows.push(['REVENUE TIMELINE']);
            rows.push(['Date', 'Revenue', 'Orders']);
            reportData.revenue.forEach((row) => {
                rows.push([row.date, row.revenue, row.orders]);
            });
            rows.push([]);
        }
        if (reportData.payments) {
            rows.push(['PAYMENT STATISTICS']);
            Object.entries(reportData.payments).forEach(([key, value]) => {
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
            rows.push(['Event Name', 'Tickets Sold', 'Capacity', 'Utilization']);
            reportData.events.forEach((e) => {
                rows.push([e.name, e.ticketsSold, e.capacity, e.utilization]);
            });
            rows.push([]);
        }
        if (reportData.users) {
            rows.push(['USER STATISTICS']);
            Object.entries(reportData.users).forEach(([key, value]) => {
                rows.push([key, value]);
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
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-4xl font-bold mb-2 text-gray-800 dark:text-white", children: "Reports" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Create and manage custom analytics reports" })] }), error && (_jsxs("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" }), _jsx("p", { className: "text-red-700 dark:text-red-400", children: error })] })), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6", children: [_jsx("h2", { className: "text-2xl font-bold mb-6 text-gray-900 dark:text-white", children: "Create New Report" }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100", children: "Report Name" }), _jsx("input", { type: "text", value: reportName, onChange: (e) => setReportName(e.target.value), placeholder: "e.g., Monthly Revenue Report", className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white" })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100", children: "Date Range" }), _jsx("div", { className: "flex gap-3", children: ['7', '30', '90'].map((range) => (_jsxs("button", { onClick: () => setDateRange(range), className: `px-4 py-2 rounded transition ${dateRange === range
                                        ? 'bg-primary dark:bg-primary-dark text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`, children: ["Last ", range, " days"] }, range))) })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100", children: "Metrics to Include" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: Object.entries(selectedMetrics).map(([key, checked]) => (_jsxs("label", { className: "flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: checked, onChange: (e) => setSelectedMetrics({
                                                ...selectedMetrics,
                                                [key]: e.target.checked,
                                            }), className: "w-4 h-4 rounded" }), _jsxs("span", { className: "capitalize text-sm font-medium text-gray-900 dark:text-gray-100", children: [key === 'summary' && 'Summary Metrics', key === 'revenue' && 'Revenue Timeline', key === 'payments' && 'Payment Stats', key === 'products' && 'Top Products', key === 'events' && 'Top Events', key === 'users' && 'User Stats', key === 'orders' && 'Order Stats'] })] }, key))) })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("button", { onClick: () => generateReport(), disabled: loading, className: "flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50", children: [loading ? _jsx(Loader, { className: "w-4 h-4 animate-spin" }) : _jsx(Download, { className: "w-4 h-4" }), "Generate & Download"] }), _jsxs("button", { onClick: saveReport, disabled: loading, className: "flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50", children: [_jsx(Plus, { className: "w-4 h-4" }), "Save Report Template"] })] }), _jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400 mt-4", children: "Templates are saved in this browser only." })] }), reports.length > 0 && (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6", children: [_jsx("h2", { className: "text-2xl font-bold mb-6 text-gray-900 dark:text-white", children: "Saved Report Templates" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-4 py-3 font-semibold text-gray-900 dark:text-gray-100", children: "Report Name" }), _jsx("th", { className: "text-left px-4 py-3 font-semibold text-gray-900 dark:text-gray-100", children: "Created" }), _jsx("th", { className: "text-left px-4 py-3 font-semibold text-gray-900 dark:text-gray-100", children: "Date Range" }), _jsx("th", { className: "text-left px-4 py-3 font-semibold text-gray-900 dark:text-gray-100", children: "Metrics" }), _jsx("th", { className: "text-right px-4 py-3 font-semibold text-gray-900 dark:text-gray-100", children: "Actions" })] }) }), _jsx("tbody", { children: reports.map((report) => (_jsxs("tr", { className: "border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50", children: [_jsx("td", { className: "px-4 py-3 font-medium text-gray-900 dark:text-gray-100", children: report.name }), _jsx("td", { className: "px-4 py-3 text-gray-600 dark:text-gray-400", children: new Date(report.createdAt).toLocaleDateString() }), _jsxs("td", { className: "px-4 py-3 text-gray-600 dark:text-gray-400", children: ["Last ", report.dateRange, " days"] }), _jsxs("td", { className: "px-4 py-3 text-gray-600 dark:text-gray-400", children: [Object.values(report.metrics).filter(Boolean).length, "/7"] }), _jsx("td", { className: "text-right px-4 py-3", children: _jsxs("div", { className: "flex gap-2 justify-end", children: [_jsx("button", { onClick: () => generateReport(report), disabled: loading, className: "text-blue-600 dark:text-blue-400 hover:text-blue-700 disabled:opacity-50", children: _jsx(Download, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => deleteReport(report.id), className: "text-red-600 dark:text-red-400 hover:text-red-700", children: _jsx(Trash2, { className: "w-4 h-4" }) })] }) })] }, report.id))) })] }) })] }))] }));
}
//# sourceMappingURL=AdminReports.js.map