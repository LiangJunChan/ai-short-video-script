import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLoginMutation, useLoginByEmailMutation } from '../store/videoApi'
import { useDispatch } from 'react-redux'
import { login } from '../store/authSlice'
import { features } from '../config/features'

type LoginTab = 'username' | 'email'

function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [activeTab, setActiveTab] = useState<LoginTab>('username')

  // 用户名登录状态
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // 邮箱登录状态
  const [email, setEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showEmailPassword, setShowEmailPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [loginMutation] = useLoginMutation()
  const [loginByEmailMutation] = useLoginByEmailMutation()

  // 用户名登录
  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('请输入用户名和密码')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await loginMutation({ username, password }).unwrap()
      if (result.code === 200) {
        localStorage.setItem('token', result.data.token)
        dispatch(login(result.data))
        navigate('/')
      } else {
        setError(result.message || '登录失败')
      }
    } catch (err: any) {
      setError(err.data?.message || '用户名或密码错误')
    } finally {
      setIsLoading(false)
    }
  }

  // 邮箱登录
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !emailPassword) {
      setError('请输入邮箱和密码')
      return
    }

    // 简单邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址')
      return
    }

    if (emailPassword.length < 6) {
      setError('密码至少6个字符')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await loginByEmailMutation({ email, password: emailPassword }).unwrap()
      if (result.code === 200) {
        localStorage.setItem('token', result.data.token)
        dispatch(login(result.data))
        navigate('/')
      } else {
        setError(result.message || '登录失败')
      }
    } catch (err: any) {
      setError(err.data?.message || '邮箱或密码错误')
    } finally {
      setIsLoading(false)
    }
  }

  // 密码可见性切换图标
  const EyeIcon = ({ visible, onClick }: { visible: boolean; onClick: () => void }) => (
    <button
      type="button"
      aria-label="切换密码可见性"
      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity duration-200"
      style={{
        color: 'var(--color-text-tertiary)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {visible ? (
          <>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          </>
        ) : (
          <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </svg>
    </button>
  )

  return (
    <div className="fixed inset-0 overflow-hidden bg-av-bg-primary flex items-center justify-center p-6">
      {/* 背景层：网格 + 径向辉光 + 浮动渐变球 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 grid-bg animate-grid-move" />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, rgba(6,214,160,0.06) 0%, transparent 60%)' }}
        />
        <div
          className="absolute -top-32 -right-32 rounded-full animate-float"
          style={{ width: '400px', height: '400px', background: 'var(--color-primary-muted)', filter: 'blur(100px)' }}
        />
        <div
          className="absolute -bottom-32 -left-32 rounded-full animate-float"
          style={{ width: '350px', height: '350px', background: 'var(--color-accent-muted)', filter: 'blur(100px)', animationDelay: '2s' }}
        />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center shadow-av-glow animate-glow-pulse">
            <svg className="w-9 h-9 text-av-text-inverse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold gradient-text">AI短视频脚本平台</h1>
          <p className="text-av-text-secondary mt-2">登录到您的账户</p>
        </div>

        {/* Form Card */}
        <div className="neon-border rounded-xl p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          {/* Tab 切换 */}
          <div className="flex mb-6 rounded-lg overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
            <button
              type="button"
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'username'
                  ? 'gradient-primary text-av-text-inverse'
                  : 'text-av-text-secondary hover:text-av-text-primary'
              }`}
              onClick={() => { setActiveTab('username'); setError('') }}
            >
              用户名登录
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'email'
                  ? 'gradient-primary text-av-text-inverse'
                  : 'text-av-text-secondary hover:text-av-text-primary'
              }`}
              onClick={() => { setActiveTab('email'); setError('') }}
            >
              邮箱登录
            </button>
          </div>

          {/* 用户名登录表单 */}
          {activeTab === 'username' && (
            <form onSubmit={handleUsernameLogin} className="space-y-5">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  用户名
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field w-full px-4 py-3 text-sm rounded-lg"
                  placeholder="输入用户名"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  密码
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field w-full px-4 py-3 text-sm rounded-lg pr-11"
                    placeholder="输入密码"
                    autoComplete="current-password"
                  />
                  <EyeIcon visible={showPassword} onClick={() => setShowPassword(!showPassword)} />
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-lg" style={{ background: 'rgba(239, 71, 111, 0.1)', borderLeft: '3px solid var(--state-error)' }}>
                  <p className="text-sm" style={{ color: 'var(--state-error)' }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-gradient-primary py-3 text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                {isLoading ? '登录中...' : '登录'}
              </button>
            </form>
          )}

          {/* 邮箱登录表单 */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  邮箱
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field w-full px-4 py-3 text-sm rounded-lg"
                  placeholder="输入邮箱地址"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="login-email-password"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  密码
                </label>
                <div className="relative">
                  <input
                    id="login-email-password"
                    type={showEmailPassword ? 'text' : 'password'}
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="input-field w-full px-4 py-3 text-sm rounded-lg pr-11"
                    placeholder="输入密码"
                    autoComplete="current-password"
                  />
                  <EyeIcon visible={showEmailPassword} onClick={() => setShowEmailPassword(!showEmailPassword)} />
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-lg" style={{ background: 'rgba(239, 71, 111, 0.1)', borderLeft: '3px solid var(--state-error)' }}>
                  <p className="text-sm" style={{ color: 'var(--state-error)' }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-gradient-primary py-3 text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                {isLoading ? '登录中...' : '登录'}
              </button>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-primary font-medium hover:text-primary-hover transition-colors"
                >
                  忘记密码？
                </button>
              </div>
            </form>
          )}

          {features.signUp && (
            <div className="mt-6 text-center">
              <p className="text-sm text-av-text-secondary">
                还没有账户？{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-primary font-medium hover:text-primary-hover transition-colors"
                >
                  立即注册
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginPage
