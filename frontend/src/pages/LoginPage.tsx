import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLoginMutation } from '../store/videoApi'
import { login } from '../store/authSlice'
import { useDispatch } from 'react-redux'

function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [loginMutation, { isLoading }] = useLoginMutation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码')
      return
    }

    try {
      const result = await loginMutation({ username, password }).unwrap()
      if (result.code === 200) {
        dispatch(login({ user: result.data.user, token: result.data.token }))
        navigate('/')
      } else {
        setError(result.message || '登录失败')
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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm px-8">
        <div className="text-center mb-12">
          <h1
            className="text-3xl font-normal mb-3"
            style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.02em' }}
          >
            AI短视频脚本平台
          </h1>
          <p className="text-sm text-[#999]">登录你的账号</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="text"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-[#e5e5e5] rounded-lg text-sm outline-none focus:border-black transition-colors"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-[#e5e5e5] rounded-lg text-sm outline-none focus:border-black transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="text-center text-sm text-[#999] mt-8">
          没有账号？{' '}
          <Link to="/register" className="text-black hover:underline">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
