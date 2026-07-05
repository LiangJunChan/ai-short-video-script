import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSendCodeMutation, useResetPasswordMutation } from '../store/videoApi'

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const timerRef = useRef<number | null>(null)

  const [sendCodeMutation] = useSendCodeMutation()
  const [resetPasswordMutation] = useResetPasswordMutation()

  // 倒计时清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
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
      const result = await sendCodeMutation({ email, purpose: 'reset_password' }).unwrap()
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

  // 重置密码
  const handleSubmit = async (e: React.FormEvent) => {
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

    if (!newPassword) {
      setError('请输入新密码')
      return
    }

    if (newPassword.length < 6) {
      setError('密码至少6个字符')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setIsLoading(true)

    try {
      const result = await resetPasswordMutation({
        email,
        code,
        password: newPassword,
        confirm_password: confirmPassword,
      }).unwrap()
      if (result.code === 200) {
        setSuccess(true)
        setError('')
        // 重置成功后2秒跳转到登录页
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      } else {
        setError(result.message || '重置密码失败')
      }
    } catch (err: any) {
      setError(err.data?.message || '重置密码失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

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
              重置密码
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              通过邮箱验证码重置您的密码
            </p>
          </div>

          {/* 成功提示 */}
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(6, 214, 160, 0.15)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--state-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>密码重置成功</h3>
              <p className="text-sm text-av-text-secondary">正在跳转到登录页面...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 邮箱输入 */}
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  邮箱
                </label>
                <div className="flex gap-3">
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field flex-1 px-4 py-3 text-sm rounded-lg"
                    placeholder="输入注册时使用的邮箱"
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

              {/* 验证码 */}
              <div>
                <label
                  htmlFor="forgot-code"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  验证码
                </label>
                <input
                  id="forgot-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field w-full px-4 py-3 text-sm rounded-lg"
                  placeholder="输入6位验证码"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>

              {/* 新密码 */}
              <div>
                <label
                  htmlFor="forgot-new-password"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  新密码
                </label>
                <div className="relative">
                  <input
                    id="forgot-new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field w-full px-4 py-3 text-sm rounded-lg pr-11"
                    placeholder="设置新密码（至少6个字符）"
                    autoComplete="new-password"
                  />
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
                    onClick={() => setShowPassword(!showPassword)}
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
                      {showPassword ? (
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
                </div>
              </div>

              {/* 确认密码 */}
              <div>
                <label
                  htmlFor="forgot-confirm-password"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  确认密码
                </label>
                <input
                  id="forgot-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field w-full px-4 py-3 text-sm rounded-lg"
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                />
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="px-4 py-3 rounded-lg" style={{ background: 'rgba(239, 71, 111, 0.1)', borderLeft: '3px solid var(--state-error)' }}>
                  <p className="text-sm" style={{ color: 'var(--state-error)' }}>{error}</p>
                </div>
              )}

              {/* 提交按钮 */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-gradient-primary py-3 text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                {isLoading ? '重置中...' : '重置密码'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-av-text-secondary">
              想起密码了？{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-primary font-medium hover:text-primary-hover transition-colors"
              >
                返回登录
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
