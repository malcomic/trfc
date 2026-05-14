import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { getAllUsers, updateUserRole } from '../../api/users';
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
        return _jsx("div", { className: "text-lg text-gray-600", children: "Loading users..." });
    }
    return (_jsxs("div", { children: [_jsx("h1", { className: "text-4xl font-bold mb-8 text-gray-800", children: "Users" }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6", children: error })), success && (_jsx("div", { className: "bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6", children: success })), _jsx("div", { className: "bg-white rounded-lg shadow-md overflow-hidden", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-100 border-b", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Name" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Email" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Phone" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Role" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Joined" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Actions" })] }) }), _jsx("tbody", { children: users.map((user) => (_jsxs("tr", { className: "border-b hover:bg-gray-50", children: [_jsx("td", { className: "px-6 py-4 font-semibold", children: user.name }), _jsx("td", { className: "px-6 py-4", children: user.email }), _jsx("td", { className: "px-6 py-4", children: user.phone }), _jsx("td", { className: "px-6 py-4", children: _jsx("span", { className: `px-3 py-1 rounded-full text-sm font-semibold ${user.role === 'admin'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-blue-100 text-blue-800'}`, children: user.role }) }), _jsx("td", { className: "px-6 py-4", children: new Date(user.created_at).toLocaleDateString() }), _jsx("td", { className: "px-6 py-4", children: _jsxs("select", { value: user.role, onChange: (e) => handleRoleChange(user.id, e.target.value), disabled: updating === user.id, className: "px-3 py-1 border rounded-lg text-sm font-semibold disabled:opacity-50", children: [_jsx("option", { value: "member", children: "Member" }), _jsx("option", { value: "admin", children: "Admin" })] }) })] }, user.id))) })] }) })] }));
}
//# sourceMappingURL=AdminUsers.js.map