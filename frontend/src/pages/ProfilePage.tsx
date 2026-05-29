import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import UserInfoCard from '../components/profile/UserInfoCard'
import ChangePasswordForm from '../components/profile/ChangePasswordForm'
import ModelConfigSection from '../components/profile/ModelConfigSection'

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [toast, setToast] = useState<string | null>(null)

  if (!isAuthenticated || !user) {
    navigate('/login')
    return null
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const showSuccess = (msg: string) => showToast(msg)
  const showError = (msg: string) => showToast(msg)

  const canConfigureModel = user.user_type === 'admin' || user.user_type === 'vip'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="flex items-center h-16 px-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            返回首页
          </button>
          <h1 className="text-lg font-semibold text-slate-900 ml-4">我的</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <UserInfoCard user={user} />
        <ChangePasswordForm onSuccess={showSuccess} onError={showError} />
        {canConfigureModel && (
          <ModelConfigSection onSuccess={showSuccess} onError={showError} />
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
