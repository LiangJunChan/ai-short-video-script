import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetPublicVideosQuery, useCollectSquareVideoMutation, useGetCollectionsQuery } from '../store/videoApi'
import Loading from '../components/Loading'
import CollectionSelector from '../components/CollectionSelector'
import VideoCard from '../components/VideoCard'
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold gradient-text">短视频广场</h1>
        <div className="flex items-center gap-2 bg-av-bg-tertiary/60 rounded-full p-1">
          <span className="text-sm text-av-text-secondary pl-2">排序：</span>
          <button
            onClick={() => { setSortBy('newest'); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-full transition-all duration-200 ${
              sortBy === 'newest'
                ? 'bg-av-bg-elevated shadow-av-sm ring-1 ring-primary/30 text-primary font-medium'
                : 'text-av-text-secondary hover:text-av-text-primary'
            }`}
          >
            最新
          </button>
          <button
            onClick={() => { setSortBy('popular'); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-full transition-all duration-200 ${
              sortBy === 'popular'
                ? 'bg-av-bg-elevated shadow-av-sm ring-1 ring-primary/30 text-primary font-medium'
                : 'text-av-text-secondary hover:text-av-text-primary'
            }`}
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
                {/* Collection overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                {/* Collect count badge */}
                {video.collectCount > 0 && (
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 bg-[rgba(8,9,13,0.6)] backdrop-blur-sm text-av-text-primary text-xs rounded-xl">
                      ♡ {video.collectCount}
                    </span>
                  </div>
                )}
                {/* Tags */}
                {video.tags && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {video.tags.split(',').slice(0, 3).map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 bg-av-bg-tertiary text-av-text-secondary text-xs rounded-full">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-av-text-secondary bg-av-bg-secondary border border-av-border-subtle rounded-full hover:bg-av-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>

              <span className="px-4 py-2 text-sm text-av-text-secondary">
                {page} / {pagination.totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 text-sm font-medium text-av-text-secondary bg-av-bg-secondary border border-av-border-subtle rounded-full hover:bg-av-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-av-bg-elevated/90 backdrop-blur-sm text-av-text-primary px-6 py-3 rounded-2xl shadow-av-md z-av-toast animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}

export default SquarePage
