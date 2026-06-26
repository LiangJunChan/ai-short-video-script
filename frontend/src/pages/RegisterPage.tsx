import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRegisterMutation } from '../store/videoApi'
import { features } from '../config/features'

function RegisterPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [registerMutation] = useRegisterMutation()

  // 注册功能关闭时重定向回登录页
  useEffect(() => {
    if (!features.signUp) navigate('/login', { replace: true })
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
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

  // 注册关闭时不渲染表单（重定向期间）
  if (!features.signUp) return null

  return (
    <div className="fixed inset-0 overflow-hidden bg-av-bg-primary flex items-center justify-center p-6">
      {/* 背景层 */}
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
          <h1 className="text-2xl font-bold gradient-text">创建账户</h1>
          <p className="text-av-text-secondary mt-2">开始使用AI短视频脚本平台</p>
        </div>

        {/* Form Card */}
        <div className="neon-border rounded-xl p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-av-text-primary mb-2">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field w-full px-4 py-3 text-sm rounded-lg"
                placeholder="设置用户名（至少3个字符）"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-av-text-primary mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full px-4 py-3 text-sm rounded-lg"
                placeholder="设置密码（至少6个字符）"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-av-text-primary mb-2">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field w-full px-4 py-3 text-sm rounded-lg"
                placeholder="再次输入密码"
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
