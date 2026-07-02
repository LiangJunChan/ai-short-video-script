import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useGetVideoDetailQuery,
  useReextractVideoMutation,
  useDeleteVideoMutation,
  useGetMeQuery,
  useCreateStoryboardMutation,
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

  // 关键:
  // 1) refetchOnMountOrArgChange 保证每次进入详情页都强制 refetch,不吃 60s 缓存
  //    (否则:上传后停在 processing → 返回主页 → 再进详情,RTK Query 命中缓存仍显示 processing)
  // 2) 动态 pollingInterval:后端 AI 提取是异步 goroutine,前端不轮询无法感知完成。
  //    status === 'processing' 时每 3s 拉一次,拿到 done/failed 后置 0 自动停止,不浪费请求
  const [pollInterval, setPollInterval] = useState(0)
  const { data, isLoading } = useGetVideoDetailQuery(numericId, {
    refetchOnMountOrArgChange: true,
    pollingInterval: pollInterval,
  })
  const video = data?.data

  useEffect(() => {
    setPollInterval(video?.status === 'processing' ? 3000 : 0)
  }, [video?.status])

  const { refetch: refetchMe } = useGetMeQuery()
  const [reextractVideo, { isLoading: isReextracting }] = useReextractVideoMutation()
  const [deleteVideo] = useDeleteVideoMutation()
  const [createStoryboard] = useCreateStoryboardMutation()

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

  const handleCreateStoryboard = async () => {
    if (!video) return
    try {
      const result = await createStoryboard({ name: video.title, videoId: video.id }).unwrap()
      navigate(`/storyboard/${result.data.id}`)
    } catch (err) {
      console.error(err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-av-bg-primary">
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
      <div className="min-h-screen bg-av-bg-primary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-32">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-av-bg-tertiary flex items-center justify-center">
              <svg className="w-10 h-10 text-av-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-av-text-secondary mb-6">视频不存在或加载失败</p>
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
    <div className="min-h-screen bg-av-bg-primary">
      <div className="max-w-7xl mx-auto">
        {/* Top Bar - Back and Delete */}
        <div className="flex justify-between items-center h-14 px-6 pt-4">
          <button
            className="flex items-center gap-2 text-sm text-av-text-secondary hover:text-av-text-primary transition-colors"
            onClick={() => navigate('/')}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            返回列表
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-av-state-error hover:bg-av-state-error/10 rounded-lg transition-colors"
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
                <h2 className="text-lg font-semibold text-av-text-primary">AI 提取文案</h2>
                <div className="flex gap-2">
                  {video.status === 'done' && video.aiText && (
                    <button
                      onClick={handleCreateStoryboard}
                      className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-av-bg-hover transition-colors"
                    >
                      创建分镜脚本
                    </button>
                  )}
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
                <div className="text-center py-12 text-sm text-av-text-secondary">
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
                <div className="p-4 bg-av-bg-tertiary rounded-xl border border-av-border-subtle">
                  <div className="text-sm leading-relaxed text-av-text-secondary whitespace-pre-wrap max-h-64 overflow-y-auto">
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
          className="fixed bottom-8 right-8 w-12 h-12 bg-av-bg-elevated hover:bg-av-bg-active text-av-text-primary rounded-full shadow-av-lg flex items-center justify-center transition-all hover:scale-105 z-av-tooltip"
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
