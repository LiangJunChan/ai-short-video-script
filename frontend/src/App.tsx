import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import VideoList from './components/VideoList'
import UploadModal from './components/UploadModal'
import Toast from './components/Toast'
import { useAuth } from './hooks/useAuth'
import { logout, updateCredits } from './store/authSlice'
import { videoApi } from './store/videoApi'

function App() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const { data: checkinData } = videoApi.useGetCheckinStatusQuery(undefined, {
    skip: !isAuthenticated,
  })
  const { data: meData, refetch: refetchMe } = videoApi.useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  })
  const [doCheckin, { isLoading: isCheckingIn }] = videoApi.useDoCheckinMutation()

  // 页面加载时同步最新用户积分
  useEffect(() => {
    if (meData?.data?.credits !== undefined && meData.data.credits !== user?.credits) {
      dispatch(updateCredits(meData.data.credits))
    }
  }, [meData, user?.credits, dispatch])

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => {
      setToast(null)
    }, 3000)
  }

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
        refetchMe() // 刷新用户信息
        showToast('签到成功，获得20积分')
      }
    } catch (err: any) {
      if (err.data?.message) {
        showToast(err.data.message)
      } else {
        showToast('签到失败，请重试')
      }
    }
  }

  const checkedIn = checkinData?.data?.checkedIn ?? false

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-12">
        <header className="flex justify-between items-center py-10 pb-12">
          <h1 className="text-3xl font-normal" style={{ fontFamily: 'var(--font-serif)', letterSpacing: '-0.02em' }}>
            AI短视频脚本平台
          </h1>
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                {/* 积分悬浮区域 - 增加 padding 扩大 hover 范围 */}
                <div className="relative group py-2 px-1">
                  <span className="text-sm text-[#666] cursor-default">
                    积分: <span className="font-medium text-black">{user.credits}</span>
                  </span>
                  {/* 悬浮面板 - 用 group-hover 显示，mt-1 减小间距 */}
                  <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white shadow-lg rounded-lg p-4 w-48 z-50 border border-[#e5e5e5]">
                    <p className="text-xs text-[#999] mb-3">
                      {checkedIn ? '✓ 今日已签到' : '今日未签到'}
                    </p>
                    {!checkedIn && (
                      <button
                        onClick={handleCheckin}
                        disabled={isCheckingIn}
                        className="w-full py-2 bg-black text-white text-sm rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
                      >
                        {isCheckingIn ? '签到中...' : '签到 +20'}
                      </button>
                    )}
                  </div>
                </div>
                <span className="text-sm text-[#999]">|</span>
                <span className="text-sm text-[#666]">{user.username}</span>
                <button
                  className="px-4 py-2 border border-[#e5e5e5] rounded-lg text-sm text-[#666] hover:border-black hover:text-black transition-colors"
                  onClick={handleLogout}
                >
                  退出
                </button>
                <button
                  className="px-7 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                  onClick={() => setShowUploadModal(true)}
                >
                  上传视频
                </button>
              </>
            ) : (
              <button
                className="px-7 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                onClick={() => navigate('/login')}
              >
                登录
              </button>
            )}
          </div>
        </header>

        <main className="min-h-[calc(100vh-160px)]">
          <VideoList />
        </main>
      </div>

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={() => {
            setShowUploadModal(false)
            showToast('上传成功，正在提取文案...')
          }}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  )
}

export default App
