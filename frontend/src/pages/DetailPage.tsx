import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useGetVideoDetailQuery,
  useReextractVideoMutation,
  useDeleteVideoMutation,
  useGetMeQuery,
} from '../store/videoApi'
import Loading from '../components/Loading'
import Toast from '../components/Toast'
import DeleteModal from '../components/DeleteModal'
import VideoBasicInfo from '../components/VideoBasicInfo'
import TextRewriteSection from '../components/TextRewriteSection'
import DeepAnalysisSection from '../components/DeepAnalysisSection'

function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const numericId = Number(id)

  const [toast, setToast] = useState<string | null>(null)
  const [showBackTop, setShowBackTop] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const { data, isLoading } = useGetVideoDetailQuery(numericId)
  const { refetch: refetchMe } = useGetMeQuery()
  const [reextractVideo, { isLoading: isReextracting }] = useReextractVideoMutation()
  const [deleteVideo] = useDeleteVideoMutation()

  const video = data?.data

  // Scroll to show/hide back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast('文案已复制')
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      showToast('文案已复制')
    }
  }

  const handleReextract = async () => {
    try {
      const result = await reextractVideo(numericId).unwrap()
      if (result.code === 200) {
        showToast('已开始重新提取文案')
        refetchMe()
      } else {
        showToast(result.message || '重新提取失败')
      }
    } catch (err: any) {
      showToast(err.data?.message || '网络错误，请重试')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteVideo(numericId).unwrap()
      showToast('删除成功')
      navigate('/')
    } catch {
      showToast('删除失败，请重试')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-32">
            <Loading />
          </div>
        </div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-32">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-50 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-slate-600 mb-6">视频不存在或加载失败</p>
            <button
              className="btn-secondary px-6 py-2.5 text-sm"
              onClick={() => navigate('/')}
            >
              返回列表
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Top Bar - Back and Delete */}
        <div className="flex justify-between items-center h-14 px-6 pt-4">
          <button
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            onClick={() => navigate('/')}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            返回列表
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            onClick={() => setShowDeleteModal(true)}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            删除
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8 px-6">
          {/* Left: Video and Basic Info */}
          <div className="lg:col-span-4">
            <VideoBasicInfo
              video={video}
              videoId={numericId}
              onToast={showToast}
            />
          </div>

          {/* Right: AI Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* AI Extracted Text */}
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-900">AI 提取文案</h2>
                <div className="flex gap-2">
                  {video.status === 'done' && video.aiText && (
                    <button
                      className="btn-secondary px-3 py-1.5 text-xs"
                      onClick={() => handleCopy(video.aiText!)}
                    >
                      复制
                    </button>
                  )}
                  <button
                    className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
                    onClick={handleReextract}
                    disabled={isReextracting || video.status === 'processing'}
                  >
                    {isReextracting ? '提取中...' : '重新提取'}
                  </button>
                </div>
              </div>

              {video.status !== 'done' ? (
                <div className="text-center py-12 text-sm text-slate-500">
                  {(() => {
                    switch (video.status) {
                      case 'processing':
                        return '正在提取文案，请稍候...'
                      case 'failed':
                        return '当前视频暂无法提取文案，请尝试上传清晰且包含中文语音的视频'
                      default:
                        return ''
                    }
                  })()}
                </div>
              ) : video.aiText ? (
                <div className="p-4 bg-sky-50 rounded-xl border border-sky-100">
                  <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {video.aiText}
                  </div>
                </div>
              ) : null}
            </div>

            {/* AI Rewrite */}
            {video.status === 'done' && video.aiText && (
              <TextRewriteSection
                video={video}
                videoId={numericId}
                onToast={showToast}
                onCopy={handleCopy}
                onRefetchUser={refetchMe}
              />
            )}

            {/* AI Deep Analysis */}
            {video.status === 'done' && video.aiText && (
              <DeepAnalysisSection
                videoId={numericId}
                onToast={showToast}
                onCopy={handleCopy}
                onRefetchUser={refetchMe}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showDeleteModal && (
        <DeleteModal
          message="确定要删除这个视频吗？此操作不可撤销。"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {toast && <Toast message={toast} />}

      {/* Back to Top Button */}
      {showBackTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-12 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-50"
          title="返回顶部"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}

export default DetailPage
