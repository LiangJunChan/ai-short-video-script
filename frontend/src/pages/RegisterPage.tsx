import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRegisterMutation } from '../store/videoApi'

function RegisterPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [registerMutation] = useRegisterMutation()

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-lg">
            <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">创建账户</h1>
          <p className="text-slate-500 mt-2">开始使用AI短视频脚本平台</p>
        </div>

        {/* Form */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field w-full px-4 py-3 text-sm rounded-xl"
                placeholder="设置用户名（至少3个字符）"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full px-4 py-3 text-sm rounded-xl"
                placeholder="设置密码（至少6个字符）"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field w-full px-4 py-3 text-sm rounded-xl"
                placeholder="再次输入密码"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3 text-sm shadow-md disabled:opacity-50"
            >
              {isLoading ? '注册中...' : '注册'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              已有账户？{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-sky-600 font-medium hover:text-sky-700"
              >
                立即登录
              </button>
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-6 p-4 bg-white/60 backdrop-blur rounded-xl border border-slate-100">
          <p className="text-xs text-slate-500 text-center space-y-1">
            <p>✨ 注册即送初始积分</p>
            <p>📅 每日签到可获得积分</p>
            <p>🎬 支持抖音/快手视频链接提取</p>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
