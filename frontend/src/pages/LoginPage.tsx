import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLoginMutation } from '../store/videoApi'
import { useDispatch } from 'react-redux'
import { login } from '../store/authSlice'

function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [loginMutation] = useLoginMutation()

  const handleSubmit = async (e: React.FormEvent) => {
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
          <h1 className="text-2xl font-bold text-slate-900">AI短视频脚本平台</h1>
          <p className="text-slate-500 mt-2">登录到您的账户</p>
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
                placeholder="输入用户名"
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
                placeholder="输入密码"
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
              {isLoading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              还没有账户？{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-sky-600 font-medium hover:text-sky-700"
              >
                立即注册
              </button>
            </p>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-white/60 backdrop-blur rounded-xl border border-slate-100">
          <p className="text-xs text-slate-500 text-center">
            💡 演示账号：用户名 luka，密码 123456
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
