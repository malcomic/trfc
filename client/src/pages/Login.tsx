import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser } from '../api/auth'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  const onSubmit = async (data: any) => {
    try {
      setLoading(true)
      setErrorMessage('')
      const response = await loginUser(data)
      login(response.token, response.user, response.refreshToken)
      navigate('/')
    } catch (error: any) {
      console.error('Login failed:', error)
      setErrorMessage(error.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-2 text-center">Welcome Back</h1>
          <p className="text-gray-600 text-center mb-8">Login to your account</p>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input type="email" {...register('email', { required: 'Email is required' })} placeholder="you@example.com" className="w-full border rounded-lg px-4 py-2" />
              {errors.email && <span className="text-red-500 text-sm">{errors.email.message as string}</span>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input type="password" {...register('password', { required: 'Password is required' })} placeholder="••••••••" className="w-full border rounded-lg px-4 py-2" />
              {errors.password && <span className="text-red-500 text-sm">{errors.password.message as string}</span>}
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:scale-105 transition disabled:opacity-50 mt-6">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600">
            Don't have an account? <Link to="/register" className="text-primary font-semibold hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
