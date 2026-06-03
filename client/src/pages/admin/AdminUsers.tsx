import { useState, useEffect } from 'react'
import { getAllUsers, updateUserRole } from '../../api/users'
import { useAuth } from '../../context/AuthContext'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'

interface User {
  id: string
  name: string
  email: string
  phone: string
  role: string
  created_at: string
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; newRole: string } | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await getAllUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError('Failed to fetch users')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const adminCount = users.filter((u) => u.role === 'admin').length

  const requestRoleChange = (userId: string, newRole: string, currentRole: string) => {
    if (newRole === currentRole) return

    if (newRole === 'member') {
      if (userId === currentUser?.id) {
        setPendingRoleChange({ userId, newRole })
        return
      }
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
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      setSuccess(`User role updated to ${newRole}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to update user role')
      console.error(err)
    } finally {
      setUpdating(null)
      setPendingRoleChange(null)
    }
  }

  const getConfirmMessage = () => {
    if (!pendingRoleChange) return ''
    const target = users.find((u) => u.id === pendingRoleChange.userId)
    if (pendingRoleChange.userId === currentUser?.id && pendingRoleChange.newRole === 'member') {
      return 'You are about to remove your own admin access. You will be locked out of the admin panel.'
    }
    return `Change ${target?.name || 'this user'}'s role to ${pendingRoleChange.newRole}?`
  }

  if (loading) {
    return <div className="text-lg text-gray-600 dark:text-gray-400">Loading users...</div>
  }

  return (
    <div>
      <AdminPageHeader title="Users" />

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
            No users found
          </div>
        }
        desktop={
          <table className="w-full min-w-[720px]">
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
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        user.role === 'admin'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => requestRoleChange(user.id, e.target.value, user.role)}
                      disabled={updating === user.id}
                      className="px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        mobile={users.map((user) => (
          <AdminMobileCard
            key={user.id}
            footer={
              <select
                value={user.role}
                onChange={(e) => requestRoleChange(user.id, e.target.value, user.role)}
                disabled={updating === user.id}
                className="w-full px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            }
          >
            <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
            <AdminMobileCardRow label="Email" value={user.email} />
            <AdminMobileCardRow label="Phone" value={user.phone || '—'} />
            <AdminMobileCardRow
              label="Role"
              value={
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    user.role === 'admin'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                  }`}
                >
                  {user.role}
                </span>
              }
            />
            <AdminMobileCardRow label="Joined" value={new Date(user.created_at).toLocaleDateString()} />
          </AdminMobileCard>
        ))}
      />

      <AdminConfirmDialog
        open={pendingRoleChange !== null}
        title="Change user role"
        message={getConfirmMessage()}
        confirmLabel="Change role"
        variant={pendingRoleChange?.newRole === 'member' ? 'danger' : 'default'}
        onConfirm={confirmRoleChange}
        onCancel={() => setPendingRoleChange(null)}
      />
    </div>
  )
}
