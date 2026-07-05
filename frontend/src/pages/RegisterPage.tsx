import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRegisterMutation, useSendCodeMutation, useRegisterByEmailMutation } from '../store/videoApi'
import { useDispatch } from 'react-redux'
import { login } from '../store/authSlice'
import { features } from '../config/features'
import EyeIcon from '../components/EyeIcon'

type RegisterTab = 'username' | 'email'

function RegisterPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [activeTab, setActiveTab] = useState<RegisterTab>(
    features.usernameSignUp ? 'username' : 'email'
  )

  // 用户名注册状态
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // 邮箱注册状态
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailConfirmPassword, setEmailConfirmPassword] = useState('')
  const [showEmailPassword, setShowEmailPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const timerRef = useRef<number | null>(null)

  const [registerMutation] = useRegisterMutation()
  const [sendCodeMutation] = useSendCodeMutation()
  const [registerByEmailMutation] = useRegisterByEmailMutation()

  // 注册功能关闭时重定向回登录页
  useEffect(() => {
    if (!features.signUp) navigate('/login', { replace: true })
  }, [navigate])

  // 倒计时清理
  useEffect(() => {
    if (timerRef.current) {
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [])

  // 开始倒计时
  const startCountdown = useCallback(() => {
    setCountdown(60)
    timerRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // 发送验证码
  const handleSendCode = async () => {
    if (!email.trim()) {
      setError('请输入邮箱地址')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址')
      return
    }

    try {
      const result = await sendCodeMutation({ email, purpose: 'register' }).unwrap()
      if (result.code === 200) {
        startCountdown()
        setError('')
      } else {
        setError(result.message || '发送验证码失败')
      }
    } catch (err: any) {
      setError(err.data?.message || '发送验证码失败，请稍后重试')
    }
  }

  // 用户名注册
  const handleUsernameRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('请输入用户名')
      return
    }

    if (username.length < 3) {
      setError('用户名至少3个字符')
      return
    }

    if (!password) {
      setError('请输入密码')
      return
    }

    if (password.length < 6) {
      setError('密码至少6个字符')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setIsLoading(true)

    try {
      const result = await registerMutation({ username, password }).unwrap()
      if (result.code === 200) {
        alert('注册成功，请登录')
        navigate('/login')
      } else {
        setError(result.message || '注册失败')
      }
    } catch (err: any) {
      setError(err.data?.message || '注册失败，用户名可能已被占用')
    } finally {
      setIsLoading(false)
    }
  }

  // 邮箱注册
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('请输入邮箱地址')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址')
      return
    }

    if (!code.trim()) {
      setError('请输入验证码')
      return
    }

    if (!/^\d{6}$/.test(code)) {
      setError('验证码为6位数字')
      return
    }

    if (!emailPassword) {
      setError('请输入密码')
      return
    }

    if (emailPassword.length < 6) {
      setError('密码至少6个字符')
      return
    }

    if (emailPassword !== emailConfirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setIsLoading(true)

    try {
      const result = await registerByEmailMutation({
        email,
        code,
        password: emailPassword,
        confirm_password: emailConfirmPassword,
      }).unwrap()
      if (result.code === 200) {
        localStorage.setItem('token', result.data.token)
        dispatch(login(result.data))
        navigate('/')
      } else {
        setError(result.message || '注册失败')
      }
    } catch (err: any) {
      setError(err.data?.message || '注册失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 注册关闭时不渲染表单（重定向期间）
  if (!features.signUp) return null

  return (
    <div className="fixed inset-0 overflow-hidden bg-av-bg-primary flex items-center justify-center p-4 sm:p-6">
      {/* 背景层 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 grid-bg animate-grid-move" />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, rgba(6,214,160,0.06) 0%, transparent 60%)' }}
        />
        {/* 扫描线 */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute left-0 w-full"
            style={{
              height: '2px',
              background: 'linear-gradient(90deg, transparent, rgba(6,214,160,0.08), transparent)',
              animation: 'scanline 8s linear infinite',
            }}
          />
        </div>
        <div
          className="absolute -top-32 -right-32 rounded-full animate-float"
          style={{ width: '400px', height: '400px', background: 'var(--color-primary-muted)', filter: 'blur(100px)' }}
        />
        <div
          className="absolute -bottom-32 -left-32 rounded-full animate-float"
          style={{ width: '350px', height: '350px', background: 'var(--color-accent-muted)', filter: 'blur(100px)', animationDelay: '2s' }}
        />
        {/* 粒子点缀 */}
        <div className="absolute top-[12%] left-[8%] w-1 h-1 rounded-full" style={{ background: 'var(--color-primary)', opacity: 0.3 }} />
        <div className="absolute top-[25%] right-[15%] w-0.5 h-0.5 rounded-full" style={{ background: 'var(--color-accent)', opacity: 0.25 }} />
        <div className="absolute top-[60%] left-[5%] w-0.5 h-0.5 rounded-full" style={{ background: 'var(--color-primary)', opacity: 0.2 }} />
        <div className="absolute bottom-[20%] right-[10%] w-1 h-1 rounded-full" style={{ background: 'var(--color-accent)', opacity: 0.2 }} />
        <div className="absolute top-[40%] right-[6%] w-0.5 h-0.5 rounded-full" style={{ background: 'var(--color-primary)', opacity: 0.15 }} />
        <div className="absolute bottom-[35%] left-[12%] w-1 h-1 rounded-full" style={{ background: 'var(--color-accent)', opacity: 0.18 }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mb-4 animate-glow-pulse" style={{ boxShadow: 'var(--shadow-glow)' }}>
            <img src="/logo.jpg" alt="谷语AI" className="w-full h-full object-cover" />
          </div>
          <h1
            className="heading-xl gradient-text"
            style={{ textWrap: 'balance', wordBreak: 'keep-all' }}
          >
            谷语AI
          </h1>
        </div>

        {/* Form Card */}
        <div className="neon-border rounded-xl p-6 sm:p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="mb-6">
            <h2
              className="heading-md mb-1"
              style={{ color: 'var(--color-text-primary)', textWrap: 'balance', wordBreak: 'keep-all' }}
            >
              创建账户
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              开始使用谷语AI
            </p>
          </div>

          {/* Tab 切换：仅当用户名注册开启时显示 */}
          {features.usernameSignUp && (
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
                用户名注册
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
                邮箱注册
              </button>
            </div>
          )}

          {/* 用户名注册表单 */}
          {features.usernameSignUp && activeTab === 'username' && (
            <form onSubmit={handleUsernameRegister} className="space-y-5">
              <div>
                <label
                  htmlFor="reg-username"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  用户名
                </label>
                <input
                  id="reg-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field w-full px-4 py-3 text-sm rounded-lg"
                  placeholder="设置用户名（至少3个字符）"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  密码
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field w-full px-4 py-3 text-sm rounded-lg pr-11"
                    placeholder="设置密码（至少6个字符）"
                    autoComplete="new-password"
                  />
                  <EyeIcon visible={showPassword} onClick={() => setShowPassword(!showPassword)} />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-confirm"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  确认密码
                </label>
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field w-full px-4 py-3 text-sm rounded-lg"
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                />
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
                {isLoading ? '注册中...' : '注册'}
              </button>
            </form>
          )}

          {/* 邮箱注册表单 */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailRegister} className="space-y-5">
              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  邮箱
                </label>
                <div className="flex gap-3">
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field flex-1 px-4 py-3 text-sm rounded-lg"
                    placeholder="输入邮箱地址"
                    autoComplete="email"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                    className="px-4 py-3 text-sm font-medium rounded-lg whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: countdown > 0 ? 'var(--color-bg-primary)' : 'var(--color-primary)',
                      color: countdown > 0 ? 'var(--color-text-tertiary)' : 'var(--color-text-inverse)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {countdown > 0 ? `${countdown}s` : '发送验证码'}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-code"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  验证码
                </label>
                <input
                  id="reg-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field w-full px-4 py-3 text-sm rounded-lg"
                  placeholder="输入6位验证码"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-email-password"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  密码
                </label>
                <div className="relative">
                  <input
                    id="reg-email-password"
                    type={showEmailPassword ? 'text' : 'password'}
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="input-field w-full px-4 py-3 text-sm rounded-lg pr-11"
                    placeholder="设置密码（至少6个字符）"
                    autoComplete="new-password"
                  />
                  <EyeIcon visible={showEmailPassword} onClick={() => setShowEmailPassword(!showEmailPassword)} />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-email-confirm"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  确认密码
                </label>
                <input
                  id="reg-email-confirm"
                  type={showEmailPassword ? 'text' : 'password'}
                  value={emailConfirmPassword}
                  onChange={(e) => setEmailConfirmPassword(e.target.value)}
                  className="input-field w-full px-4 py-3 text-sm rounded-lg"
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                />
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
                {isLoading ? '注册中...' : '注册'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-av-text-secondary">
              已有账户？{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-primary font-medium hover:text-primary-hover transition-colors"
              >
                立即登录
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
