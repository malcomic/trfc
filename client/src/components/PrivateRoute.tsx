import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface PrivateRouteProps {
  children: React.ReactNode
  role?: string
  loginPath?: string
}

export default function PrivateRoute({ children, role, loginPath = '/login' }: PrivateRouteProps) {
  const { token, user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white">
        Loading...
      </div>
    )
  }

  if (!token) {
    return <Navigate to={loginPath} />
  }

  if (role && user && user.role !== role) {
    return <Navigate to="/" />
  }

  return <>{children}</>
}
