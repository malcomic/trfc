import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface PrivateRouteProps {
  children: React.ReactNode
  role?: string
  loginPath?: string
}

export default function PrivateRoute({ children, role, loginPath = '/login' }: PrivateRouteProps) {
  const { token, user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-night light:bg-night-light text-chalk font-barlow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent light:border-accent-light mx-auto mb-3" />
          <p className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog">Loading…</p>
        </div>
      </div>
    )
  }

  if (!token) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    const loginUrl = `${loginPath}?redirect=${redirect}`
    return <Navigate to={loginUrl} replace />
  }

  if (role && user && user.role !== role) {
    return <Navigate to="/" />
  }

  return <>{children}</>
}
