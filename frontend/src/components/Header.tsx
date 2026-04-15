import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { User } from '../types'
import { videoApi } from '../store/videoApi'
import { logout, updateCredits } from '../store/authSlice'

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

  const { data: checkinData } = videoApi.useGetCheckinStatusQuery(undefined, {
    skip: !isAuthenticated,
  })
  const { refetch: refetchMe } = videoApi.useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  })
  const [doCheckin, { isLoading: isCheckingIn }] = videoApi.useDoCheckinMutation()

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
        refetchMe()
        onShowToast('签到成功，获得50积分')
      }
    } catch (err: any) {
      onShowToast(err.data?.message || '签到失败，请重试')
    }
  }

  const checkedIn = checkinData?.data?.checkedIn ?? false

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100">
      <div className="flex justify-between items-center h-16 px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
            AI短视频脚本平台
          </h1>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              {/* Credits Badge */}
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-100 hover:bg-sky-100 transition-colors">
                  <svg className="w-4 h-4 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v12M8 10h8M8 14h8" strokeLinecap="round"/>
                  </svg>
                  <span className="text-sm font-medium text-sky-700">{user.credits}</span>
                </button>

                {/* Checkin Dropdown */}
                <div className="absolute right-0 top-full mt-2 hidden group-hover:block w-52 animate-scale-in">
                  <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-4">
                    <p className="text-xs text-slate-500 mb-3">
                      {checkedIn ? '✓ 今日已签到' : '今日未签到'}
                    </p>
                    {!checkedIn && (
                      <button
                        onClick={handleCheckin}
                        disabled={isCheckingIn}
                        className="w-full py-2 bg-gradient-to-r from-sky-400 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-sky-500 hover:to-blue-600 transition-all disabled:opacity-50 shadow-sm"
                      >
                        {isCheckingIn ? '签到中...' : '签到 +50'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Library */}
              <button
                onClick={() => navigate('/library')}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
              >
                素材库
              </button>

              {/* User */}
              <span className="text-sm text-slate-500 px-2">{user.username}</span>

              {/* Action Buttons */}
              <button
                onClick={onOpenUrlExtract}
                className="btn-secondary px-4 py-2 text-sm"
              >
                链接提取
              </button>
              <button
                onClick={onOpenUpload}
                className="btn-primary px-4 py-2 text-sm shadow-sm"
              >
                上传视频
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="退出登录"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="btn-primary px-6 py-2 text-sm shadow-sm"
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
