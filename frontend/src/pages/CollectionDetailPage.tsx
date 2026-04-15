import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  useGetCollectionDetailQuery,
  useRemoveVideoFromCollectionMutation,
} from '../store/videoApi'
import VideoCard from '../components/VideoCard'

function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const collectionId = parseInt(id || '0')

  const { data, isLoading } = useGetCollectionDetailQuery(collectionId)
  const [removeVideo] = useRemoveVideoFromCollectionMutation()

  const handleRemoveVideo = async (videoId: number) => {
    if (!confirm('确定要从收藏夹移除这个视频吗？')) return

    try {
      await removeVideo({ collectionId, videoId }).unwrap()
    } catch (err: any) {
      alert(err.data?.message || '移除失败')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-12 py-8">
        <div className="text-center py-12">加载中...</div>
      </div>
    )
  }

  if (!data?.data?.collection) {
    return (
      <div className="max-w-7xl mx-auto px-12 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">收藏夹不存在</p>
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

  const { collection, videos, pagination } = data.data

  return (
    <div className="max-w-7xl mx-auto px-12 py-8">
      {/* 收藏夹信息 */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/library')}
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          ← 返回素材库
        </button>
        <div className="flex items-start gap-4">
          {collection.icon && <span className="text-4xl">{collection.icon}</span>}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{collection.name}</h1>
            {collection.description && (
              <p className="text-gray-600 mt-2">{collection.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              共 {collection.videoCount} 个视频 · 创建于 {new Date(collection.createdAt).toLocaleDateString('zh-CN')}
            </p>
          </div>
        </div>
      </div>

      {/* 视频列表 */}
      {videos.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <p className="text-gray-600">收藏夹还没有视频</p>
          <p className="text-sm text-gray-500 mt-2">在视频详情页添加到收藏夹</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div key={video.id} className="relative group">
                <VideoCard 
                  video={video} 
                  onClick={() => navigate(`/detail/${video.id}`)}
                  onDelete={() => {}}
                />
                <button
                  onClick={() => handleRemoveVideo(video.id)}
                  className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                >
                  移除
                </button>
              </div>
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

export default CollectionDetailPage
