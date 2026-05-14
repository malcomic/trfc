import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../api/auth'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  const onSubmit = async (data: any) => {
    try {
      setLoading(true)
      setErrorMessage('')
      const response = await registerUser(data)
      login(response.token, response.user, response.refreshToken)
      navigate('/')
    } catch (error: any) {
      console.error('Registration failed:', error)
      setErrorMessage(error.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-2 text-center">Join TRFC</h1>
          <p className="text-gray-600 text-center mb-8">Create your account</p>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Full Name</label>
              <input type="text" {...register('name', { required: 'Name is required' })} placeholder="John Doe" className="w-full border rounded-lg px-4 py-2" />
              {errors.name && <span className="text-red-500 text-sm">{errors.name.message as string}</span>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input type="email" {...register('email', { required: 'Email is required' })} placeholder="you@example.com" className="w-full border rounded-lg px-4 py-2" />
              {errors.email && <span className="text-red-500 text-sm">{errors.email.message as string}</span>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Phone</label>
              <input type="tel" {...register('phone', { required: 'Phone is required' })} placeholder="254XXXXXXXXX" className="w-full border rounded-lg px-4 py-2" />
              {errors.phone && <span className="text-red-500 text-sm">{errors.phone.message as string}</span>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input type="password" {...register('password', { required: 'Password is required' })} placeholder="••••••••" className="w-full border rounded-lg px-4 py-2" />
              {errors.password && <span className="text-red-500 text-sm">{errors.password.message as string}</span>}
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:scale-105 transition disabled:opacity-50 mt-6">
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600">
            Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
