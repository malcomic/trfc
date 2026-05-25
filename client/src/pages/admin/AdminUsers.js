import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { getAllUsers, updateUserRole } from '../../api/users';
import AdminLayout from '../../components/AdminLayout';
export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [updating, setUpdating] = useState(null);
    useEffect(() => {
        fetchUsers();
    }, []);
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await getAllUsers();
            setUsers(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError('Failed to fetch users');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleRoleChange = async (userId, newRole) => {
        try {
            setUpdating(userId);
            setError('');
            setSuccess('');
            await updateUserRole(userId, newRole);
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            setSuccess(`User role updated to ${newRole}`);
            setTimeout(() => setSuccess(''), 3000);
        }
        catch (err) {
            setError('Failed to update user role');
            console.error(err);
        }
        finally {
            setUpdating(null);
        }
    };
    if (loading) {
        return (_jsx(AdminLayout, { children: _jsx("div", { className: "text-lg text-gray-600 dark:text-gray-400", children: "Loading users..." }) }));
    }
    return (_jsxs(AdminLayout, { children: [_jsx("h1", { className: "text-4xl font-bold mb-8 text-gray-800 dark:text-white", children: "Users" }), error && (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6", children: error })), success && (_jsx("div", { className: "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-6", children: success })), _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Name" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Email" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Phone" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Role" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Joined" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Actions" })] }) }), _jsx("tbody", { children: users.map((user) => (_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100", children: [_jsx("td", { className: "px-6 py-4 font-semibold", children: user.name }), _jsx("td", { className: "px-6 py-4", children: user.email }), _jsx("td", { className: "px-6 py-4", children: user.phone }), _jsx("td", { className: "px-6 py-4", children: _jsx("span", { className: `px-3 py-1 rounded-full text-sm font-semibold ${user.role === 'admin'
                                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'}`, children: user.role }) }), _jsx("td", { className: "px-6 py-4", children: new Date(user.created_at).toLocaleDateString() }), _jsx("td", { className: "px-6 py-4", children: _jsxs("select", { value: user.role, onChange: (e) => handleRoleChange(user.id, e.target.value), disabled: updating === user.id, className: "px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white", children: [_jsx("option", { value: "member", children: "Member" }), _jsx("option", { value: "admin", children: "Admin" })] }) })] }, user.id))) })] }) })] }));
}
//# sourceMappingURL=AdminUsers.js.map