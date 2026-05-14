import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface PrivateRouteProps {
  children: React.ReactNode
  role?: string
}

export default function PrivateRoute({ children, role }: PrivateRouteProps) {
  const { token, user } = useAuth()

  if (!token) {
    return <Navigate to="/login" />
  }

  if (role && user && user.role !== role) {
    return <Navigate to="/" />
  }

  return <>{children}</>
}
