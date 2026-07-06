import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { User } from '../types'
import { videoApi } from '../store/videoApi'
import { updateCredits } from '../store/authSlice'
import { useAuthContext } from '../contexts/AuthContext'

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
  const { logout } = useAuthContext()

  const { data: checkinData } = videoApi.useGetCheckinStatusQuery(undefined, {
    skip: !isAuthenticated,
  })
  const { refetch: refetchMe } = videoApi.useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  })
  const [doCheckin, { isLoading: isCheckingIn }] = videoApi.useDoCheckinMutation()

  const handleLogout = () => {
    logout()
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
      className="sticky top-0 z-av-sticky"
      style={{
        background: 'rgba(15, 17, 23, 0.8)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Logo + Nav Pills */}
        <div className="flex items-center gap-4 sm:gap-8 min-w-0 flex-1">
          {/* Logo */}
          <div className="flex items-center gap-2.5 group cursor-pointer flex-shrink-0" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-av-glow transition-all duration-300 group-hover:shadow-av-glow-strong group-hover:scale-105">
              <img src="/logo.jpg" alt="谷语AI" className="w-full h-full object-cover" />
            </div>
            <span className="text-base font-semibold text-av-text-primary tracking-tight">
              谷语AI
            </span>
          </div>

          {/* Navigation Pills */}
          {isAuthenticated && user && (
            <div
              className="flex items-center gap-1 rounded-av-lg px-1 py-1 overflow-x-auto no-scrollbar min-w-0"
              style={{ background: 'rgba(22, 24, 34, 0.6)' }}
            >
              <button
                onClick={() => navigate('/')}
                className={`nav-pill px-3 sm:px-4 py-1.5 rounded-av-md text-sm font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                  location.pathname === '/' ? 'nav-pill-active' : ''
                }`}
                style={
                  location.pathname !== '/'
                    ? { color: 'var(--color-text-secondary)' }
                    : undefined
                }
              >
                我的视频
              </button>

              <button
                onClick={() => navigate('/square')}
                className={`nav-pill px-3 sm:px-4 py-1.5 rounded-av-md text-sm font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                  location.pathname === '/square' ? 'nav-pill-active' : ''
                }`}
                style={
                  location.pathname !== '/square'
                    ? { color: 'var(--color-text-secondary)' }
                    : undefined
                }
              >
                广场
              </button>

              <button
                onClick={() => navigate('/library')}
                className={`nav-pill px-3 sm:px-4 py-1.5 rounded-av-md text-sm font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                  location.pathname.startsWith('/library') ? 'nav-pill-active' : ''
                }`}
                style={
                  !location.pathname.startsWith('/library')
                    ? { color: 'var(--color-text-secondary)' }
                    : undefined
                }
              >
                素材库
              </button>

              <button
                onClick={() => navigate('/storyboards')}
                className={`nav-pill px-3 sm:px-4 py-1.5 rounded-av-md text-sm font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                  location.pathname.startsWith('/storyboards') ? 'nav-pill-active' : ''
                }`}
                style={
                  !location.pathname.startsWith('/storyboards')
                    ? { color: 'var(--color-text-secondary)' }
                    : undefined
                }
              >
                脚本
              </button>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {isAuthenticated && user ? (
            <>
              {/* Credits Badge */}
              <div className="relative group">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-av-md text-sm cursor-pointer"
                  style={{
                    background: 'rgba(22, 24, 34, 0.6)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    {user.credits}
                  </span>
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

              {/* Profile */}
              <button
                onClick={() => navigate('/profile')}
                className={`hidden sm:flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-av-md transition-all duration-200 cursor-pointer ${
                  location.pathname === '/profile'
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'text-av-text-secondary hover:text-av-text-primary hover:bg-av-bg-hover'
                }`}
                title={user.username}
              >
                <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-av-text-inverse text-xs font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[100px] truncate">{user.username}</span>
              </button>

              {/* Mobile Profile (avatar only) */}
              <button
                onClick={() => navigate('/profile')}
                className="sm:hidden w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-av-text-inverse text-xs font-semibold cursor-pointer"
                title={user.username}
                aria-label={user.username}
              >
                {user.username.charAt(0).toUpperCase()}
              </button>

              {/* Ghost Button: 链接提取 */}
              <button
                onClick={onOpenUrlExtract}
                className="hidden md:block px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer"
                style={{
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-subtle)',
                  background: 'transparent',
                }}
              >
                链接提取
              </button>

              {/* Primary Button: 上传视频 */}
              <button
                onClick={onOpenUpload}
                className="px-3 sm:px-4 py-1.5 rounded-lg text-sm font-semibold btn-gradient-primary hover:opacity-90 transition-opacity duration-200 cursor-pointer whitespace-nowrap"
                style={{ color: 'var(--color-text-inverse)', border: 'none' }}
              >
                <span className="hidden sm:inline">上传视频</span>
                <span className="sm:hidden">上传</span>
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 cursor-pointer"
                style={{
                  color: 'var(--color-text-tertiary)',
                  background: 'transparent',
                  border: 'none',
                }}
                title="退出登录"
                aria-label="退出登录"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="btn-gradient-primary px-6 py-2 text-sm"
            >
              登录
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
