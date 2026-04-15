import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useGetTagVideosQuery, useGetTagsQuery } from '../store/videoApi'
import VideoCard from '../components/VideoCard'

function TagFilterPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const tagId = parseInt(id || '0')

  const { data, isLoading } = useGetTagVideosQuery({ tagId, page, pageSize: 20 })
  const { data: tagsData } = useGetTagsQuery({ page: 1, pageSize: 1 })

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-12 py-8">
        <div className="text-center py-12">加载中...</div>
      </div>
    )
  }

  if (!data?.data?.videos) {
    return (
      <div className="max-w-7xl mx-auto px-12 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">标签不存在</p>
          <button
            onClick={() => navigate('/library')}
            className="mt-4 text-blue-600"
          >
            返回素材库
          </button>
        </div>
      </div>
    )
  }

  const { videos, pagination } = data.data
  let tagName: string | null = null

  // 从标签列表获取名称
  if (tagsData?.data?.tags) {
    const tag = tagsData.data.tags.find(t => t.id === tagId)
    if (tag) {
      tagName = tag.name
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-12 py-8">
      {/* 标签信息 */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/library')}
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          ← 返回素材库
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          #{tagName || '标签'}
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          共 {pagination.total} 个视频
        </p>
      </div>

      {/* 视频列表 */}
      {videos.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <p className="text-gray-600">这个标签下还没有视频</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <VideoCard 
                key={video.id} 
                video={video}
                onClick={() => navigate(`/detail/${video.id}`)}
                onDelete={() => {}}
              />
            ))}
          </div>

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded border disabled:opacity-50"
              >
                上一页
              </button>
              <span className="text-gray-600">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 rounded border disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default TagFilterPage
