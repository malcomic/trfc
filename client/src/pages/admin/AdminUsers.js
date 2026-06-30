import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Trash2, Edit2, Plus, KeyRound, Search } from 'lucide-react';
import { getAllUsers, createUser, updateUser, updateUserRole, resetUserPassword, deleteUser, } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import AdminConfirmDialog from '../../components/AdminConfirmDialog';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard';
import AdminResponsiveData from '../../components/admin/AdminResponsiveData';
export default function AdminUsers() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [updating, setUpdating] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [modalMode, setModalMode] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [resetPasswordUser, setResetPasswordUser] = useState(null);
    const [pendingRoleChange, setPendingRoleChange] = useState(null);
    const [saving, setSaving] = useState(false);
    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const { register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPasswordForm, formState: { errors: passwordErrors }, } = useForm();
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const params = {};
            if (searchQuery.trim())
                params.search = searchQuery.trim();
            if (roleFilter)
                params.role = roleFilter;
            const data = await getAllUsers(params);
            setUsers(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError('Failed to fetch users');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    }, [searchQuery, roleFilter]);
    useEffect(() => {
        const timer = setTimeout(fetchUsers, searchQuery ? 300 : 0);
        return () => clearTimeout(timer);
    }, [fetchUsers, searchQuery]);
    const adminCount = users.filter((u) => u.role === 'admin').length;
    const showSuccess = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 3000);
    };
    const openCreateModal = () => {
        setEditingUser(null);
        setModalMode('create');
        reset({ name: '', email: '', phone: '', password: '', role: 'member' });
    };
    const openEditModal = (user) => {
        setEditingUser(user);
        setModalMode('edit');
        reset({ name: user.name, email: user.email, phone: user.phone, role: user.role });
    };
    const closeModal = () => {
        setModalMode(null);
        setEditingUser(null);
        reset();
    };
    const onSubmitUser = async (data) => {
        try {
            setSaving(true);
            setError('');
            if (modalMode === 'create') {
                if (!data.password || data.password.length < 8) {
                    setError('Password must be at least 8 characters');
                    return;
                }
                await createUser({
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    password: data.password,
                    role: data.role,
                });
                showSuccess('User created successfully');
            }
            else if (editingUser) {
                await updateUser(editingUser.id, {
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                });
                showSuccess('User updated successfully');
            }
            closeModal();
            fetchUsers();
        }
        catch (err) {
            const message = err && typeof err === 'object' && 'response' in err
                ? err.response?.data?.error
                : undefined;
            setError(message || 'Failed to save user');
        }
        finally {
            setSaving(false);
        }
    };
    const requestRoleChange = (userId, newRole, currentRole) => {
        if (newRole === currentRole)
            return;
        if (newRole === 'member') {
            if (adminCount <= 1 && currentRole === 'admin') {
                setError('Cannot demote the last admin');
                return;
            }
        }
        setPendingRoleChange({ userId, newRole });
    };
    const confirmRoleChange = async () => {
        if (!pendingRoleChange)
            return;
        const { userId, newRole } = pendingRoleChange;
        try {
            setUpdating(userId);
            setError('');
            setSuccess('');
            await updateUserRole(userId, newRole);
            setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
            showSuccess(`User role updated to ${newRole}`);
        }
        catch (err) {
            setError('Failed to update user role');
            console.error(err);
        }
        finally {
            setUpdating(null);
            setPendingRoleChange(null);
        }
    };
    const confirmDelete = async () => {
        if (!deleteId)
            return;
        try {
            setError('');
            await deleteUser(deleteId);
            setUsers(users.filter((u) => u.id !== deleteId));
            showSuccess('User deleted successfully');
        }
        catch (err) {
            const message = err && typeof err === 'object' && 'response' in err
                ? err.response?.data?.error
                : undefined;
            setError(message || 'Failed to delete user');
        }
        finally {
            setDeleteId(null);
        }
    };
    const onSubmitPasswordReset = async (data) => {
        if (!resetPasswordUser)
            return;
        if (data.password !== data.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        try {
            setSaving(true);
            setError('');
            await resetUserPassword(resetPasswordUser.id, data.password);
            showSuccess(`Password reset for ${resetPasswordUser.name}`);
            setResetPasswordUser(null);
            resetPasswordForm();
        }
        catch (err) {
            const message = err && typeof err === 'object' && 'response' in err
                ? err.response?.data?.error
                : undefined;
            setError(message || 'Failed to reset password');
        }
        finally {
            setSaving(false);
        }
    };
    const getRoleConfirmMessage = () => {
        if (!pendingRoleChange)
            return '';
        const target = users.find((u) => u.id === pendingRoleChange.userId);
        if (pendingRoleChange.userId === currentUser?.id && pendingRoleChange.newRole === 'member') {
            return 'You are about to remove your own admin access. You will be locked out of the admin panel.';
        }
        return `Change ${target?.name || 'this user'}'s role to ${pendingRoleChange.newRole}?`;
    };
    const deleteTarget = users.find((u) => u.id === deleteId);
    const canDelete = (user) => user.id !== currentUser?.id && !(user.role === 'admin' && adminCount <= 1);
    const roleBadge = (role) => (_jsx("span", { className: `px-3 py-1 rounded-full text-sm font-semibold ${role === 'admin'
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'}`, children: role }));
    const userActions = (user) => (_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("select", { value: user.role, onChange: (e) => requestRoleChange(user.id, e.target.value, user.role), disabled: updating === user.id, className: "px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white", "aria-label": `Change role for ${user.name}`, children: [_jsx("option", { value: "member", children: "Member" }), _jsx("option", { value: "admin", children: "Admin" })] }), _jsx("button", { onClick: () => openEditModal(user), className: "flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px] px-2", title: "Edit user", children: _jsx(Edit2, { size: 18 }) }), _jsx("button", { onClick: () => {
                    setError('');
                    resetPasswordForm();
                    setResetPasswordUser(user);
                }, className: "flex items-center gap-1 text-amber-600 dark:text-amber-400 min-h-[44px] px-2", title: "Reset password", children: _jsx(KeyRound, { size: 18 }) }), _jsx("button", { onClick: () => setDeleteId(user.id), disabled: !canDelete(user), className: "flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px] px-2 disabled:opacity-40 disabled:cursor-not-allowed", title: canDelete(user) ? 'Delete user' : 'Cannot delete this user', children: _jsx(Trash2, { size: 18 }) })] }));
    if (loading && users.length === 0) {
        return _jsx("div", { className: "text-lg text-gray-600 dark:text-gray-400", children: "Loading users..." });
    }
    return (_jsxs("div", { children: [_jsx(AdminPageHeader, { title: "Users", subtitle: `${users.length} user${users.length === 1 ? '' : 's'}`, actions: _jsxs("button", { onClick: openCreateModal, className: "flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white dark:text-black px-6 py-2 rounded-lg hover:opacity-90 transition w-full sm:w-auto", children: [_jsx(Plus, { size: 20 }), "Add User"] }) }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3 mb-6", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { size: 18, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" }), _jsx("input", { type: "search", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "Search by name, email, or phone...", className: "w-full pl-10 pr-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" })] }), _jsxs("select", { value: roleFilter, onChange: (e) => setRoleFilter(e.target.value), className: "px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:w-40", children: [_jsx("option", { value: "", children: "All roles" }), _jsx("option", { value: "member", children: "Members" }), _jsx("option", { value: "admin", children: "Admins" })] })] }), error && (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6", children: error })), success && (_jsx("div", { className: "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-6", children: success })), _jsx(AdminResponsiveData, { isEmpty: users.length === 0, empty: _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400", children: searchQuery || roleFilter ? 'No users match your filters' : 'No users found' }), desktop: _jsxs("table", { className: "w-full min-w-[900px]", children: [_jsx("thead", { className: "bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Name" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Email" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Phone" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Role" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Joined" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Actions" })] }) }), _jsx("tbody", { children: users.map((user) => (_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100", children: [_jsx("td", { className: "px-6 py-4 font-semibold", children: user.name }), _jsx("td", { className: "px-6 py-4", children: user.email }), _jsx("td", { className: "px-6 py-4", children: user.phone }), _jsx("td", { className: "px-6 py-4", children: roleBadge(user.role) }), _jsx("td", { className: "px-6 py-4", children: new Date(user.created_at).toLocaleDateString() }), _jsx("td", { className: "px-6 py-4", children: userActions(user) })] }, user.id))) })] }), mobile: users.map((user) => (_jsxs(AdminMobileCard, { footer: userActions(user), children: [_jsx("p", { className: "font-semibold text-gray-900 dark:text-white", children: user.name }), _jsx(AdminMobileCardRow, { label: "Email", value: user.email }), _jsx(AdminMobileCardRow, { label: "Phone", value: user.phone || '—' }), _jsx(AdminMobileCardRow, { label: "Role", value: roleBadge(user.role) }), _jsx(AdminMobileCardRow, { label: "Joined", value: new Date(user.created_at).toLocaleDateString() })] }, user.id))) }), modalMode && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[85vh] overflow-y-auto", children: [_jsx("div", { className: "p-6 border-b border-gray-200 dark:border-gray-700", children: _jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: modalMode === 'create' ? 'Add User' : 'Edit User' }) }), _jsxs("form", { onSubmit: handleSubmit(onSubmitUser), className: "p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Name *" }), _jsx("input", { type: "text", ...register('name', { required: 'Name is required' }), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" }), errors.name && _jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: errors.name.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Email *" }), _jsx("input", { type: "email", ...register('email', { required: 'Email is required' }), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" }), errors.email && _jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: errors.email.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Phone *" }), _jsx("input", { type: "tel", ...register('phone', { required: 'Phone is required' }), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" }), errors.phone && _jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: errors.phone.message })] }), modalMode === 'create' && (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Password *" }), _jsx("input", { type: "password", ...register('password', {
                                                        required: 'Password is required',
                                                        minLength: { value: 8, message: 'At least 8 characters' },
                                                    }), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white", autoComplete: "new-password" }), errors.password && (_jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: errors.password.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Role" }), _jsxs("select", { ...register('role'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white", children: [_jsx("option", { value: "member", children: "Member" }), _jsx("option", { value: "admin", children: "Admin" })] })] })] })), _jsxs("div", { className: "flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2", children: [_jsx("button", { type: "button", onClick: closeModal, className: "px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100", children: "Cancel" }), _jsx("button", { type: "submit", disabled: saving, className: "px-4 py-2 bg-primary dark:bg-primary-dark text-white dark:text-black rounded-lg hover:opacity-90 disabled:opacity-50", children: saving ? 'Saving...' : modalMode === 'create' ? 'Create User' : 'Save Changes' })] })] })] }) })), resetPasswordUser && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900 dark:text-white mb-2", children: "Reset Password" }), _jsxs("p", { className: "text-gray-600 dark:text-gray-400 mb-6", children: ["Set a new password for ", resetPasswordUser.name, "."] }), _jsxs("form", { onSubmit: handlePasswordSubmit(onSubmitPasswordReset), className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "New Password *" }), _jsx("input", { type: "password", ...registerPassword('password', {
                                                required: 'Password is required',
                                                minLength: { value: 8, message: 'At least 8 characters' },
                                            }), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white", autoComplete: "new-password" }), passwordErrors.password && (_jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: passwordErrors.password.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100", children: "Confirm Password *" }), _jsx("input", { type: "password", ...registerPassword('confirmPassword', { required: 'Please confirm the password' }), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white", autoComplete: "new-password" }), passwordErrors.confirmPassword && (_jsx("span", { className: "text-red-600 dark:text-red-400 text-sm", children: passwordErrors.confirmPassword.message }))] }), _jsxs("div", { className: "flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2", children: [_jsx("button", { type: "button", onClick: () => {
                                                setResetPasswordUser(null);
                                                resetPasswordForm();
                                            }, className: "px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100", children: "Cancel" }), _jsx("button", { type: "submit", disabled: saving, className: "px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50", children: saving ? 'Resetting...' : 'Reset Password' })] })] })] }) })), _jsx(AdminConfirmDialog, { open: pendingRoleChange !== null, title: "Change user role", message: getRoleConfirmMessage(), confirmLabel: "Change role", variant: pendingRoleChange?.newRole === 'member' ? 'danger' : 'default', onConfirm: confirmRoleChange, onCancel: () => setPendingRoleChange(null) }), _jsx(AdminConfirmDialog, { open: deleteId !== null, title: "Delete user", message: `Permanently delete ${deleteTarget?.name || 'this user'}? Their order history will be kept but unlinked.`, confirmLabel: "Delete user", variant: "danger", onConfirm: confirmDelete, onCancel: () => setDeleteId(null) })] }));
}
//# sourceMappingURL=AdminUsers.js.map