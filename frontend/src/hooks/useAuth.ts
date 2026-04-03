import { useSelector } from 'react-redux'
import type { RootState } from '../store'

export function useAuth() {
  const { user, token, isAuthenticated } = useSelector((state: RootState) => state.auth)
  return { user, token, isAuthenticated }
}
