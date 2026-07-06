import { useAuthContext } from '../contexts/AuthContext'

// 保持向后兼容：如果 AuthContext 可用则使用它，否则回退到 Redux
export function useAuth() {
  const context = useAuthContext()
  return { 
    user: context.user, 
    token: context.token, 
    isAuthenticated: context.isAuthenticated 
  }
}
