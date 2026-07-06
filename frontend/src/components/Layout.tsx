import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import Header from './Header'
import UploadModal from './UploadModal'
import UrlExtractModal from './UrlExtractModal'
import Toast from './Toast'
import { useAuthContext } from '../contexts/AuthContext'
import { updateCredits } from '../store/authSlice'
import { videoApi } from '../store/videoApi'

function Layout() {
  const dispatch = useDispatch()
  const { user, isAuthenticated } = useAuthContext()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showUrlExtractModal, setShowUrlExtractModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const { data: meData } = videoApi.useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  })

  useEffect(() => {
    if (meData?.data?.credits !== undefined && meData.data.credits !== user?.credits) {
      dispatch(updateCredits(meData.data.credits))
    }
  }, [meData, user?.credits, dispatch])

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="min-h-screen bg-av-bg-primary">
      <Header
        user={user}
        isAuthenticated={isAuthenticated}
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenUrlExtract={() => setShowUrlExtractModal(true)}
        onShowToast={showToast}
      />

      {/* Main Content — 各子页面自行控制宽度与 padding */}
      <main className="min-h-[calc(100vh-4rem)]">
        <Outlet context={{ onOpenUpload: () => setShowUploadModal(true) }} />
      </main>

      {/* Modals */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={() => {
            setShowUploadModal(false)
            showToast('上传成功，正在提取文案...')
          }}
        />
      )}

      {showUrlExtractModal && (
        <UrlExtractModal
          onClose={() => setShowUrlExtractModal(false)}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  )
}

export default Layout
