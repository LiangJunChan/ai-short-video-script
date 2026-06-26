import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { User } from '../types'
import { videoApi } from '../store/videoApi'
import { logout, updateCredits } from '../store/authSlice'

interface HeaderProps {
  user: User | null
  isAuthenticated: boolean
  onOpenUpload: () => void
  onOpenUrlExtract: () => void
  onShowToast: (msg: string) => void
}

function Header({ user, isAuthenticated, onOpenUpload, onOpenUrlExtract, onShowToast }: HeaderProps) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: checkinData } = videoApi.useGetCheckinStatusQuery(undefined, {
    skip: !isAuthenticated,
  })
  const { refetch: refetchMe } = videoApi.useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  })
  const [doCheckin, { isLoading: isCheckingIn }] = videoApi.useDoCheckinMutation()

  const handleLogout = () => {
    dispatch(logout())
    dispatch(videoApi.util.resetApiState())
    navigate('/login')
  }

  const handleCheckin = async () => {
    try {
      const result = await doCheckin().unwrap()
      if (result.code === 200) {
        dispatch(updateCredits(result.data.credits))
        refetchMe()
        onShowToast('签到成功，获得30积分')
      }
    } catch (err: any) {
      onShowToast(err.data?.message || '签到失败，请重试')
    }
  }

  const checkedIn = checkinData?.data?.checkedIn ?? false

  return (
    <header
      className="sticky top-0 z-av-sticky h-16 flex items-center justify-between px-8 glass"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-av-glow transition-all duration-300 group-hover:shadow-av-glow-strong group-hover:scale-105">
          <svg className="w-5 h-5 text-av-text-inverse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-av-text-primary tracking-tight">
          AI短视频脚本平台
        </h1>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {isAuthenticated && user ? (
          <>
            {/* Credits Badge */}
            <div className="relative group">
              <button
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-av-bg-tertiary border border-av-border-subtle hover:border-av-border-strong hover:shadow-av-glow transition-all duration-200"
              >
                <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v12M8 10h8M8 14h8" strokeLinecap="round"/>
                </svg>
                <span className="text-sm font-semibold text-primary">{user.credits}</span>
              </button>

              {/* Checkin Dropdown */}
              <div className="absolute right-0 top-full pt-2 hidden group-hover:block w-52 animate-scale-in">
                <div className="glass rounded-2xl border border-av-border-subtle shadow-av-floating p-4">
                  <p className="text-xs text-av-text-secondary mb-3">
                    {checkedIn ? '✓ 今日已签到' : '今日未签到'}
                  </p>
                  {!checkedIn && (
                    <button
                      onClick={handleCheckin}
                      disabled={isCheckingIn}
                      className="w-full py-2.5 btn-gradient-primary text-sm font-medium rounded-xl transition-all disabled:opacity-50 shadow-av-glow hover:shadow-av-glow-strong"
                    >
                      {isCheckingIn ? '签到中...' : '签到 +30'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Pills */}
            <div className="flex items-center gap-1 bg-av-bg-tertiary/60 rounded-full p-1">
              <button
                onClick={() => navigate('/square')}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                  location.pathname === '/square'
                    ? 'nav-pill-active'
                    : 'text-av-text-secondary hover:text-av-text-primary hover:bg-av-bg-hover'
                }`}
              >
                广场
              </button>

              <button
                onClick={() => navigate('/library')}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                  location.pathname.startsWith('/library')
                    ? 'nav-pill-active'
                    : 'text-av-text-secondary hover:text-av-text-primary hover:bg-av-bg-hover'
                }`}
              >
                素材库
              </button>

              <button
                onClick={() => navigate('/storyboards')}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                  location.pathname.startsWith('/storyboards')
                    ? 'nav-pill-active'
                    : 'text-av-text-secondary hover:text-av-text-primary hover:bg-av-bg-hover'
                }`}
              >
                脚本
              </button>
            </div>

            {/* Profile */}
            <button
              onClick={() => navigate('/profile')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                location.pathname === '/profile'
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'text-av-text-secondary hover:text-av-text-primary hover:bg-av-bg-hover'
              }`}
            >
              <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-av-text-inverse text-[10px] font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
              {user.username}
            </button>

            {/* Action Buttons */}
            <button
              onClick={onOpenUrlExtract}
              className="btn-secondary px-4 py-2 text-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              链接提取
            </button>
            <button
              onClick={onOpenUpload}
              className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              上传视频
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 text-av-text-tertiary hover:text-av-state-error hover:bg-av-bg-hover rounded-xl transition-all duration-200"
              title="退出登录"
            >
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="btn-primary px-6 py-2 text-sm"
          >
            登录
          </button>
        )}
      </div>
    </header>
  )
}

export default Header
