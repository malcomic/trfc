import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { loginUser } from '../api/auth'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AdminLogin() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, user } = useAuth()

  const getRedirectPath = () => {
    const redirect = searchParams.get('redirect')
    if (!redirect) return '/admin'
    try {
      const decoded = decodeURIComponent(redirect)
      if (decoded.startsWith('/admin') && !decoded.startsWith('//')) return decoded
    } catch {
      /* ignore malformed redirect */
    }
    return '/admin'
  }

  useEffect(() => {
    if (user && user.role === 'admin') {
      navigate(getRedirectPath())
    }
  }, [user, navigate])

  const onSubmit = async (data: any) => {
    try {
      setLoading(true)
      setErrorMessage('')
      const response = await loginUser(data)

      if (response.user.role !== 'admin') {
        setErrorMessage('Admin access required. Only admins can login here.')
        return
      }

      login(response.token, response.user, response.refreshToken)
      navigate(getRedirectPath())
    } catch (error: any) {
      console.error('Login failed:', error)
      setErrorMessage(error.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-primary text-white px-6 py-3 rounded-full font-bold text-lg">
              ADMIN PORTAL
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-2 text-center text-gray-800 dark:text-white">Admin Login</h1>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-8">Access the administration panel</p>

          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">Email</label>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                placeholder="admin@example.com"
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50"
              />
              {errors.email && <span className="text-red-500 dark:text-red-400 text-sm">{errors.email.message as string}</span>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">Password</label>
              <input
                type="password"
                {...register('password', { required: 'Password is required' })}
                placeholder="••••••••"
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50"
              />
              {errors.password && <span className="text-red-500 dark:text-red-400 text-sm">{errors.password.message as string}</span>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 mt-6"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
              Need member login? <Link to="/login" className="text-primary font-semibold hover:underline">Click here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
