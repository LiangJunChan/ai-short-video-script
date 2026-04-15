import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetVideoListQuery, useDeleteVideoMutation } from '../store/videoApi'
import VideoCard from './VideoCard'
import Loading from './Loading'
import Pagination from './Pagination'
import DeleteModal from './DeleteModal'
import type { Video } from '../types'

function VideoList() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(12)
  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null)

  const { data, isLoading, refetch } = useGetVideoListQuery({ page, pageSize })
  const [deleteVideo] = useDeleteVideoMutation()

  const videos = data?.data?.videos ?? []
  const pagination = data?.data?.pagination

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCardClick = (videoId: number) => {
    navigate(`/detail/${videoId}`)
  }

  const handleDelete = (video: Video) => {
    setDeleteTarget(video)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteVideo(deleteTarget.id).unwrap()
      refetch()
    } catch (error) {
      console.error('删除失败:', error)
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleCancelDelete = () => {
    setDeleteTarget(null)
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <>
      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-neutral-500">
          <svg
            className="w-14 h-14 mb-6 opacity-30"
            viewBox="0 0 56 56"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="4" y="10" width="48" height="36" rx="4" />
            <polygon points="22,20 38,28 22,36" fill="currentColor" opacity="0.4" />
            <line x1="4" y1="50" x2="52" y2="50" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-light">暂无视频上传，点击右上角上传视频</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={() => handleCardClick(video.id)}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      {deleteTarget && (
        <DeleteModal
          title="确认删除"
          message={`确定要删除视频「${deleteTarget.title}」吗？此操作不可恢复。`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </>
  )
}

export default VideoList
