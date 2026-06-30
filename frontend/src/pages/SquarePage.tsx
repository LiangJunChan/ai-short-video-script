import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetPublicVideosQuery, useCollectSquareVideoMutation, useGetCollectionsQuery } from '../store/videoApi'
import Loading from '../components/Loading'
import CollectionSelector from '../components/CollectionSelector'
import VideoCard from '../components/VideoCard'
import Toast from '../components/Toast'
import type { Video } from '../types'
import type { SquareVideo } from '../types'

type SortBy = 'newest' | 'popular'

function SquarePage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const pageSize = 12
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  const { data, isLoading, isError, refetch } = useGetPublicVideosQuery(
    { page, pageSize, sortBy },
    { skip: false }
  )

  const { data: collectionsData } = useGetCollectionsQuery({ page: 1, pageSize: 100 })
  const [collectVideo] = useCollectSquareVideoMutation()

  const handleCollect = (videoId: number) => {
    setSelectedVideoId(videoId)
  }

  const handleAddToCollection = (collectionId: number) => {
    const videoId = selectedVideoId
    if (videoId === null) return

    collectVideo({ id: videoId, collectionId })
      .unwrap()
      .then((response) => {
        // Clear any existing timeout
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current)
        }
        setToast(response.message || '收藏成功！')
        toastTimeoutRef.current = setTimeout(() => setToast(null), 3000)
        setSelectedVideoId(null)
        // Navigate to the new video detail page
        navigate(`/detail/${response.data.newVideoId}`);
      })
      .catch((error: any) => {
        // Clear any existing timeout
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current)
        }
        setToast(error.data?.message || '收藏失败，请重试')
        toastTimeoutRef.current = setTimeout(() => setToast(null), 3000)
      });
  }

  const handleCancel = () => {
    setSelectedVideoId(null)
  }

  const goToDetail = (videoId: number) => {
    navigate(`/detail/${videoId}`)
  }

  // Convert to Video type for VideoCard
  const convertToVideo = (squareVideo: SquareVideo) => {
    return {
      id: squareVideo.id,
      title: squareVideo.title,
      videoUrl: '',
      thumbnail: squareVideo.thumbnailUrl,
      uploader: squareVideo.username,
      aiText: null,
      status: 'done' as const,
      createdAt: squareVideo.createdAt,
      isOwner: false,
      hasExtracted: false,
    } satisfies Video
  }

  if (isLoading && page === 1) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loading />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-24">
        <p className="text-av-text-secondary">加载失败，请刷新重试</p>
        <button
          onClick={() => refetch()}
          className="mt-4 btn-primary px-4 py-2"
        >
          重新加载
        </button>
      </div>
    )
  }

  const videos = data?.data?.videos ?? []
  const pagination = data?.data?.pagination

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="heading-lg gradient-text"
            style={{ textWrap: 'balance', wordBreak: 'keep-all' }}
          >
            短视频广场
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            发现热门短视频脚本，激发创作灵感
          </p>
        </div>
        {/* Sort Pills */}
        <div
          className="flex items-center gap-1 rounded-full px-1 py-1"
          style={{ background: 'rgba(22, 24, 34, 0.6)' }}
        >
          <button
            onClick={() => { setSortBy('newest'); setPage(1); }}
            className={`sort-pill-active px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
              sortBy === 'newest' ? '' : '!bg-transparent !shadow-none !text-av-text-secondary hover:!text-av-text-primary'
            }`}
          >
            最新
          </button>
          <button
            onClick={() => { setSortBy('popular'); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 cursor-pointer ${
              sortBy === 'popular' ? 'sort-pill-active' : ''
            }`}
            style={
              sortBy !== 'popular' ? { color: 'var(--color-text-secondary)' } : undefined
            }
          >
            热门
          </button>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
            <svg className="w-12 h-12 text-av-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" opacity="0.3"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-av-text-primary mb-2">广场暂无视频</h3>
          <p className="text-av-text-secondary mb-6">成为第一个上传爆款视频的创作者吧！</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {videos.map((video: SquareVideo) => (
              <div key={video.id} className="relative group">
                <VideoCard
                  video={convertToVideo(video)}
                  onClick={() => goToDetail(video.id)}
                  onDelete={() => {}}
                />
                {/* Collection overlay — 业务保留（VideoCard 内部也提供删除入口，二者并存） */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCollect(video.id)
                    }}
                    className="p-2 bg-av-bg-elevated/80 backdrop-blur-sm rounded-xl shadow-av-sm hover:bg-primary hover:text-av-text-inverse transition-colors"
                    title="收藏到素材库"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                {/* Collect count badge — 保留业务计数展示 */}
                {video.collectCount > 0 && (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="glass-bg-light px-2 py-0.5 rounded-md text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      ♡ {video.collectCount}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer"
                style={{
                  color: page === 1 ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-subtle)',
                  background: 'transparent',
                  opacity: page === 1 ? 0.5 : 1,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                上一页
              </button>

              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {page} / {pagination.totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer"
                style={{
                  color: page === pagination.totalPages ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-subtle)',
                  background: 'transparent',
                  opacity: page === pagination.totalPages ? 0.5 : 1,
                  cursor: page === pagination.totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {/* Collection Selector Modal */}
      {selectedVideoId !== null && (
        <div
          className="fixed inset-0 bg-[rgba(8,9,13,0.7)] backdrop-blur-sm z-av-modal flex items-center justify-center animate-fade-in"
          onClick={handleCancel}
        >
          <div
            className="surface neon-border rounded-xl shadow-av-floating p-6 w-full max-w-sm mx-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-av-text-primary mb-4">收藏视频到收藏夹</h3>
            <CollectionSelector
              collections={collectionsData?.data?.collections || []}
              videoCollections={[]}
              onAdd={handleAddToCollection}
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm text-av-text-secondary bg-av-bg-tertiary rounded-lg hover:bg-av-bg-hover transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast} />}
    </div>
  )
}

export default SquarePage
