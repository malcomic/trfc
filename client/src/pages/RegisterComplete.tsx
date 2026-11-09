import { useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import RegisterForm from '../components/register/RegisterForm'
import { readPendingGoogleSignup } from '../components/auth/useGoogleSignIn'
import { pageRoot } from '../utils/themeClasses'

function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

export default function RegisterComplete() {
  const pending = useMemo(() => {
    const value = readPendingGoogleSignup()
    return value && !isExpired(value.signupToken) ? value : null
  }, [])

  if (!pending) return <Navigate to="/register" replace />

  return (
    <div className={pageRoot}>
      <RegisterForm googleSignup={pending} />
    </div>
  )
}
