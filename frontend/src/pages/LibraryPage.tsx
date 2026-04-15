import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useGetCollectionsQuery,
  useCreateCollectionMutation,
  useDeleteCollectionMutation,
  useGetTagsQuery,
  useDeleteTagMutation,
} from '../store/videoApi'
import { Collection, Tag } from '../types'

function LibraryPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCollection, setNewCollection] = useState({
    name: '',
    icon: '',
    color: '',
    description: '',
  })

  const { data: collectionsData, isLoading: collectionsLoading } = useGetCollectionsQuery({ page, pageSize: 20 })
  const { data: tagsData, isLoading: tagsLoading } = useGetTagsQuery({ page: 1, pageSize: 50 })
  const [createCollection] = useCreateCollectionMutation()
  const [deleteCollection] = useDeleteCollectionMutation()
  const [deleteTag] = useDeleteTagMutation()

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCollection.name.trim()) return

    try {
      await createCollection(newCollection).unwrap()
      setShowCreateModal(false)
      setNewCollection({ name: '', icon: '', color: '', description: '' })
    } catch (err: any) {
      alert(err.data?.message || '创建失败')
    }
  }

  const handleDeleteCollection = async (id: number, name: string) => {
    if (!confirm(`确定要删除收藏夹"${name}"吗？`)) return

    try {
      await deleteCollection(id).unwrap()
    } catch (err: any) {
      alert(err.data?.message || '删除失败')
    }
  }

  const handleDeleteTag = async (id: number, name: string) => {
    if (!confirm(`确定要删除标签"${name}"吗？这将移除所有相关关联。`)) return

    try {
      await deleteTag(id).unwrap()
    } catch (err: any) {
      alert(err.data?.message || '删除失败')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-12 py-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">我的素材库</h1>
          <p className="text-gray-600 mt-2">管理你收藏的爆款视频和文案</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          ← 返回首页
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：收藏夹列表 */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">收藏夹</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + 新建收藏夹
            </button>
          </div>

          {collectionsLoading ? (
            <div className="text-center py-12">加载中...</div>
          ) : !collectionsData?.data?.collections || collectionsData.data.collections.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <p className="text-gray-600">还没有收藏夹</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-700"
              >
                创建第一个收藏夹
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collectionsData.data.collections.map((collection: Collection) => (
                <div
                  key={collection.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/library/collections/${collection.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {collection.icon && <span className="text-2xl">{collection.icon}</span>}
                        <h3 className="text-lg font-semibold text-gray-900">{collection.name}</h3>
                      </div>
                      {collection.description && (
                        <p className="text-sm text-gray-600 mb-2">{collection.description}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        {collection.videoCount} 个视频
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCollection(collection.id, collection.name)
                      }}
                      className="text-gray-400 hover:text-red-600"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {collectionsData && collectionsData.data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                上一页
              </button>
              <span className="text-gray-600">
                {page} / {collectionsData.data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(collectionsData.data.pagination.totalPages, p + 1))}
                disabled={page === collectionsData.data.pagination.totalPages}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </div>

        {/* 右侧：标签云 */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">标签</h2>
          {tagsLoading ? (
            <div className="text-center py-12">加载中...</div>
          ) : !tagsData?.data?.tags || tagsData.data.tags.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-600">还没有标签</p>
              <p className="text-sm text-gray-500 mt-2">在视频详情页添加标签</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex flex-wrap gap-2">
                {tagsData.data.tags.map((tag: Tag) => (
                  <div
                    key={tag.id}
                    className="group relative inline-flex items-center"
                  >
                    <button
                      onClick={() => navigate(`/library/tags/${tag.id}`)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm"
                    >
                      #{tag.name} ({tag.usageCount})
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTag(tag.id, tag.name)
                      }}
                      className="ml-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 创建收藏夹弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">创建收藏夹</h2>
            <form onSubmit={handleCreateCollection}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  名称 <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={newCollection.name}
                  onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="例如：美妆测评"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  图标（可选）
                </label>
                <input
                  type="text"
                  value={newCollection.icon}
                  onChange={(e) => setNewCollection({ ...newCollection, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="输入emoji，例如：💄"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  描述（可选）
                </label>
                <textarea
                  value={newCollection.description}
                  onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="描述这个收藏夹的用途"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default LibraryPage
