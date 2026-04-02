import { useState } from 'react'
import VideoList from './components/VideoList'
import UploadModal from './components/UploadModal'
import Toast from './components/Toast'

function App() {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-12">
        <header className="flex justify-between items-center py-10 pb-12">
          <h1 className="text-3xl font-normal" style={{ fontFamily: 'var(--font-serif)', letterSpacing: '-0.02em' }}>
            AI短视频脚本平台
          </h1>
          <button
            className="px-7 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
            onClick={() => setShowUploadModal(true)}
          >
            上传视频
          </button>
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
