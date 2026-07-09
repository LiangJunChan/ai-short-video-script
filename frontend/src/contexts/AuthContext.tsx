import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useDispatch } from 'react-redux'
import type { User } from '../types'
import { setUser } from '../store/authSlice'
import { videoApi } from '../store/videoApi'

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
  refreshCredits: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch()
  const [user, setUserState] = useState<User | null>(() => {
    return JSON.parse(localStorage.getItem('user') || 'null')
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token')
  })

  const isAuthenticated = !!token

  // 同步 Redux state
  useEffect(() => {
    if (user) {
      dispatch(setUser(user))
    }
  }, [user, dispatch])

  const login = useCallback((userData: User, userToken: string) => {
    setUserState(userData)
    setToken(userToken)
    localStorage.setItem('token', userToken)
    localStorage.setItem('user', JSON.stringify(userData))
  }, [])

  const logout = useCallback(() => {
    setUserState(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    dispatch(videoApi.util.resetApiState())
  }, [dispatch])

  const refreshCredits = useCallback(() => {
    // Credits are refreshed by the Layout component via videoApi
  }, [])

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    refreshCredits,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
