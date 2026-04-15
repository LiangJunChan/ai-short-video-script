import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useRegisterMutation } from '../store/videoApi'
import Toast from '../components/Toast'

function RegisterPage() {
  const navigate = useNavigate()
  const [registerMutation, { isLoading }] = useRegisterMutation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码')
      return
    }

    if (username.length < 3 || username.length > 20) {
      setError('用户名需3-20个字符')
      return
    }

    if (password.length < 6 || password.length > 50) {
      setError('密码需6-50个字符')
      return
    }

    if (password !== confirmPassword) {
      setError('两次密码输入不一致')
      return
    }

    try {
      const result = await registerMutation({ username, password }).unwrap()
      if (result.code === 200) {
        setToast('注册成功，请登录')
        setTimeout(() => navigate('/login'), 1500)
      } else {
        setError(result.message || '注册失败')
      }
    } catch (err: any) {
      if (err.data?.message) {
        setError(err.data.message)
      } else {
        setError('网络错误，请重试')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm px-8 py-12 bg-white/80 backdrop-blur-glass rounded-2xl shadow-glass border border-border-glass">
        <div className="text-center mb-10">
          <h1
            className="text-3xl font-heading font-semibold mb-3 text-primary tracking-tight"
          >
            AI短视频脚本平台
          </h1>
          <p className="text-sm text-neutral-500">创建新账号</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="text"
              placeholder="用户名（3-20字符）"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm outline-none focus:border-accent transition-all duration-200 bg-white/50"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="密码（6-50字符）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm outline-none focus:border-accent transition-all duration-200 bg-white/50"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="确认密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm outline-none focus:border-accent transition-all duration-200 bg-white/50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all duration-200 disabled:opacity-40 cursor-pointer"
          >
            {isLoading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500 mt-8">
          已有账号？{' '}
          <Link to="/login" className="text-accent font-medium hover:underline">
            立即登录
          </Link>
        </p>
      </div>

      {toast && <Toast message={toast} />}
    </div>
  )
}

export default RegisterPage
