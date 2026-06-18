import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Edit2, Plus, KeyRound, Search } from 'lucide-react'
import {
  getAllUsers,
  createUser,
  updateUser,
  updateUserRole,
  resetUserPassword,
  deleteUser,
  type AdminUser,
} from '../../api/users'
import { useAuth } from '../../context/AuthContext'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'

type RoleFilter = '' | 'member' | 'admin'
type ModalMode = 'create' | 'edit' | null

interface UserFormData {
  name: string
  email: string
  phone: string
  password?: string
  role: 'member' | 'admin'
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('')
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null)
  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; newRole: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>()
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<{ password: string; confirmPassword: string }>()

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const params: { search?: string; role?: 'member' | 'admin' } = {}
      if (searchQuery.trim()) params.search = searchQuery.trim()
      if (roleFilter) params.role = roleFilter
      const data = await getAllUsers(params)
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Failed to fetch users')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, roleFilter])

  useEffect(() => {
    const timer = setTimeout(fetchUsers, searchQuery ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchUsers, searchQuery])

  const adminCount = users.filter((u) => u.role === 'admin').length

  const showSuccess = (message: string) => {
    setSuccess(message)
    setTimeout(() => setSuccess(''), 3000)
  }

  const openCreateModal = () => {
    setEditingUser(null)
    setModalMode('create')
    reset({ name: '', email: '', phone: '', password: '', role: 'member' })
  }

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user)
    setModalMode('edit')
    reset({ name: user.name, email: user.email, phone: user.phone, role: user.role })
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingUser(null)
    reset()
  }

  const onSubmitUser = async (data: UserFormData) => {
    try {
      setSaving(true)
      setError('')

      if (modalMode === 'create') {
        if (!data.password || data.password.length < 8) {
          setError('Password must be at least 8 characters')
          return
        }
        await createUser({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          role: data.role,
        })
        showSuccess('User created successfully')
      } else if (editingUser) {
        await updateUser(editingUser.id, {
          name: data.name,
          email: data.email,
          phone: data.phone,
        })
        showSuccess('User updated successfully')
      }

      closeModal()
      fetchUsers()
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined
      setError(message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const requestRoleChange = (userId: string, newRole: string, currentRole: string) => {
    if (newRole === currentRole) return

    if (newRole === 'member') {
      if (adminCount <= 1 && currentRole === 'admin') {
        setError('Cannot demote the last admin')
        return
      }
    }

    setPendingRoleChange({ userId, newRole })
  }

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return
    const { userId, newRole } = pendingRoleChange

    try {
      setUpdating(userId)
      setError('')
      setSuccess('')
      await updateUserRole(userId, newRole as 'member' | 'admin')
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole as AdminUser['role'] } : u)))
      showSuccess(`User role updated to ${newRole}`)
    } catch (err) {
      setError('Failed to update user role')
      console.error(err)
    } finally {
      setUpdating(null)
      setPendingRoleChange(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      setError('')
      await deleteUser(deleteId)
      setUsers(users.filter((u) => u.id !== deleteId))
      showSuccess('User deleted successfully')
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined
      setError(message || 'Failed to delete user')
    } finally {
      setDeleteId(null)
    }
  }

  const onSubmitPasswordReset = async (data: { password: string; confirmPassword: string }) => {
    if (!resetPasswordUser) return
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setSaving(true)
      setError('')
      await resetUserPassword(resetPasswordUser.id, data.password)
      showSuccess(`Password reset for ${resetPasswordUser.name}`)
      setResetPasswordUser(null)
      resetPasswordForm()
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined
      setError(message || 'Failed to reset password')
    } finally {
      setSaving(false)
    }
  }

  const getRoleConfirmMessage = () => {
    if (!pendingRoleChange) return ''
    const target = users.find((u) => u.id === pendingRoleChange.userId)
    if (pendingRoleChange.userId === currentUser?.id && pendingRoleChange.newRole === 'member') {
      return 'You are about to remove your own admin access. You will be locked out of the admin panel.'
    }
    return `Change ${target?.name || 'this user'}'s role to ${pendingRoleChange.newRole}?`
  }

  const deleteTarget = users.find((u) => u.id === deleteId)
  const canDelete = (user: AdminUser) =>
    user.id !== currentUser?.id && !(user.role === 'admin' && adminCount <= 1)

  const roleBadge = (role: string) => (
    <span
      className={`px-3 py-1 rounded-full text-sm font-semibold ${
        role === 'admin'
          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
      }`}
    >
      {role}
    </span>
  )

  const userActions = (user: AdminUser) => (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={user.role}
        onChange={(e) => requestRoleChange(user.id, e.target.value, user.role)}
        disabled={updating === user.id}
        className="px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        aria-label={`Change role for ${user.name}`}
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <button
        onClick={() => openEditModal(user)}
        className="flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px] px-2"
        title="Edit user"
      >
        <Edit2 size={18} />
      </button>
      <button
        onClick={() => {
          setError('')
          resetPasswordForm()
          setResetPasswordUser(user)
        }}
        className="flex items-center gap-1 text-amber-600 dark:text-amber-400 min-h-[44px] px-2"
        title="Reset password"
      >
        <KeyRound size={18} />
      </button>
      <button
        onClick={() => setDeleteId(user.id)}
        disabled={!canDelete(user)}
        className="flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px] px-2 disabled:opacity-40 disabled:cursor-not-allowed"
        title={canDelete(user) ? 'Delete user' : 'Cannot delete this user'}
      >
        <Trash2 size={18} />
      </button>
    </div>
  )

  if (loading && users.length === 0) {
    return <div className="text-lg text-gray-600 dark:text-gray-400">Loading users...</div>
  }

  return (
    <div>
      <AdminPageHeader
        title="Users"
        subtitle={`${users.length} user${users.length === 1 ? '' : 's'}`}
        actions={
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white dark:text-black px-6 py-2 rounded-lg hover:opacity-90 transition w-full sm:w-auto"
          >
            <Plus size={20} />
            Add User
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:w-40"
        >
          <option value="">All roles</option>
          <option value="member">Members</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      <AdminResponsiveData
        isEmpty={users.length === 0}
        empty={
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400">
            {searchQuery || roleFilter ? 'No users match your filters' : 'No users found'}
          </div>
        }
        desktop={
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Phone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Joined</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                >
                  <td className="px-6 py-4 font-semibold">{user.name}</td>
                  <td className="px-6 py-4">{user.email}</td>
                  <td className="px-6 py-4">{user.phone}</td>
                  <td className="px-6 py-4">{roleBadge(user.role)}</td>
                  <td className="px-6 py-4">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{userActions(user)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        mobile={users.map((user) => (
          <AdminMobileCard key={user.id} footer={userActions(user)}>
            <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
            <AdminMobileCardRow label="Email" value={user.email} />
            <AdminMobileCardRow label="Phone" value={user.phone || '—'} />
            <AdminMobileCardRow label="Role" value={roleBadge(user.role)} />
            <AdminMobileCardRow label="Joined" value={new Date(user.created_at).toLocaleDateString()} />
          </AdminMobileCard>
        ))}
      />

      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {modalMode === 'create' ? 'Add User' : 'Edit User'}
              </h2>
            </div>

            <form onSubmit={handleSubmit(onSubmitUser)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Name *</label>
                <input
                  type="text"
                  {...register('name', { required: 'Name is required' })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.name && <span className="text-red-600 dark:text-red-400 text-sm">{errors.name.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Email *</label>
                <input
                  type="email"
                  {...register('email', { required: 'Email is required' })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.email && <span className="text-red-600 dark:text-red-400 text-sm">{errors.email.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Phone *</label>
                <input
                  type="tel"
                  {...register('phone', { required: 'Phone is required' })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.phone && <span className="text-red-600 dark:text-red-400 text-sm">{errors.phone.message}</span>}
              </div>

              {modalMode === 'create' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">
                      Password *
                    </label>
                    <input
                      type="password"
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 8, message: 'At least 8 characters' },
                      })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      autoComplete="new-password"
                    />
                    {errors.password && (
                      <span className="text-red-600 dark:text-red-400 text-sm">{errors.password.message}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Role</label>
                    <select
                      {...register('role')}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary dark:bg-primary-dark text-white dark:text-black rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : modalMode === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetPasswordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Set a new password for {resetPasswordUser.name}.
            </p>

            <form onSubmit={handlePasswordSubmit(onSubmitPasswordReset)} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">
                  New Password *
                </label>
                <input
                  type="password"
                  {...registerPassword('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'At least 8 characters' },
                  })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  autoComplete="new-password"
                />
                {passwordErrors.password && (
                  <span className="text-red-600 dark:text-red-400 text-sm">{passwordErrors.password.message}</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  {...registerPassword('confirmPassword', { required: 'Please confirm the password' })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  autoComplete="new-password"
                />
                {passwordErrors.confirmPassword && (
                  <span className="text-red-600 dark:text-red-400 text-sm">
                    {passwordErrors.confirmPassword.message}
                  </span>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetPasswordUser(null)
                    resetPasswordForm()
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminConfirmDialog
        open={pendingRoleChange !== null}
        title="Change user role"
        message={getRoleConfirmMessage()}
        confirmLabel="Change role"
        variant={pendingRoleChange?.newRole === 'member' ? 'danger' : 'default'}
        onConfirm={confirmRoleChange}
        onCancel={() => setPendingRoleChange(null)}
      />

      <AdminConfirmDialog
        open={deleteId !== null}
        title="Delete user"
        message={`Permanently delete ${deleteTarget?.name || 'this user'}? Their order history will be kept but unlinked.`}
        confirmLabel="Delete user"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
