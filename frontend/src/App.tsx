import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import VideoList from './components/VideoList'
import UploadModal from './components/UploadModal'
import UrlExtractModal from './components/UrlExtractModal'
import Toast from './components/Toast'
import Header from './components/Header'
import { useAuth } from './hooks/useAuth'
import { updateCredits } from './store/authSlice'
import { videoApi } from './store/videoApi'

function App() {
  const dispatch = useDispatch()
  const { user, isAuthenticated } = useAuth()
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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto">
        <Header
          user={user}
          isAuthenticated={isAuthenticated}
          onOpenUpload={() => setShowUploadModal(true)}
          onOpenUrlExtract={() => setShowUrlExtractModal(true)}
          onShowToast={showToast}
        />

        {/* Main Content */}
        <main className="min-h-[calc(100vh-4rem)] py-8">
          <VideoList />
        </main>
      </div>

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

export default App
