import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { User } from '../types'
import { getUserProfile, logoutUser } from '../api/auth'
import api from '../api/index'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: User, refreshToken?: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem('token')
      const savedUser = localStorage.getItem('user')
      if (!savedToken) {
        setIsLoading(false)
        return
      }
      setToken(savedToken)
      if (savedUser) setUser(JSON.parse(savedUser))

      try {
        const profile = await getUserProfile()
        setUser(profile)
        localStorage.setItem('user', JSON.stringify(profile))
      } catch (err: any) {
        if (err?.response?.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          setToken(null)
          setUser(null)
          delete api.defaults.headers.common['Authorization']
        }
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  const login = (newToken: string, newUser: User, refreshToken?: string) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('token', newToken)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  const logout = async () => {
    try {
      if (token) await logoutUser()
    } catch {
      /* ignore */
    }
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
