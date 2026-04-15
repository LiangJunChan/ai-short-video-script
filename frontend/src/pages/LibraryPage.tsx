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
    if (!confirm(`确定要删除标签"${name}"吗？`)) return
    try {
      await deleteTag(id).unwrap()
    } catch (err: any) {
      alert(err.data?.message || '删除失败')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="border-b border-slate-100">
          <div className="flex items-center justify-between h-16 px-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">我的素材库</h1>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              返回首页
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 py-8 px-6">
          {/* Collections */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">收藏夹</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary px-4 py-2 text-sm shadow-sm"
              >
                + 新建收藏夹
              </button>
            </div>

            {collectionsLoading ? (
              <div className="text-center py-12 text-slate-500">加载中...</div>
            ) : !collectionsData?.data?.collections || collectionsData.data.collections.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-slate-600 mb-4">还没有收藏夹</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary px-6 py-2 text-sm shadow-sm"
                >
                  创建第一个收藏夹
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {collectionsData.data.collections.map((collection: Collection) => (
                  <div
                    key={collection.id}
                    className="card p-6 hover:shadow-md cursor-pointer group"
                    onClick={() => navigate(`/library/collections/${collection.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {collection.icon && <span className="text-xl">{collection.icon}</span>}
                          <h3 className="font-semibold text-slate-900">{collection.name}</h3>
                        </div>
                        {collection.description && (
                          <p className="text-sm text-slate-500 mb-2 line-clamp-2">{collection.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <span>{collection.videoCount} 个视频</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCollection(collection.id, collection.name)
                        }}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {collectionsData && collectionsData.data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="text-sm text-slate-500">
                  {page} / {collectionsData.data.pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(collectionsData.data.pagination.totalPages, p + 1))}
                  disabled={page === collectionsData.data.pagination.totalPages}
                  className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            )}
          </div>

          {/* Tags Sidebar */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">标签</h2>
            {tagsLoading ? (
              <div className="text-center py-12 text-slate-500">加载中...</div>
            ) : !tagsData?.data?.tags || tagsData.data.tags.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-sm text-slate-500">还没有标签</p>
                <p className="text-xs text-slate-400 mt-2">在视频详情页添加标签</p>
              </div>
            ) : (
              <div className="card p-6">
                <div className="flex flex-wrap gap-2">
                  {tagsData.data.tags.map((tag: Tag) => (
                    <div key={tag.id} className="group inline-flex items-center">
                      <button
                        onClick={() => navigate(`/library/tags/${tag.id}`)}
                        className="badge badge-ice hover:bg-sky-100 transition-colors"
                      >
                        #{tag.name} ({tag.usageCount})
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTag(tag.id, tag.name)
                        }}
                        className="ml-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Search */}
            <button
              onClick={() => navigate('/library/search')}
              className="card w-full mt-4 p-4 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">搜索素材库</p>
                  <p className="text-xs text-slate-500">关键词、标签、收藏夹</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-900">创建收藏夹</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">名称</label>
                <input
                  type="text"
                  value={newCollection.name}
                  onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                  className="input-field w-full px-4 py-3 text-sm"
                  placeholder="例如：美妆测评"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">图标（可选）</label>
                <input
                  type="text"
                  value={newCollection.icon}
                  onChange={(e) => setNewCollection({ ...newCollection, icon: e.target.value })}
                  className="input-field w-full px-4 py-3 text-sm"
                  placeholder="输入emoji，例如：💄"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">描述（可选）</label>
                <textarea
                  value={newCollection.description}
                  onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                  className="input-field w-full px-4 py-3 text-sm resize-none"
                  rows={3}
                  placeholder="描述这个收藏夹的用途"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn-secondary py-2.5 text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary py-2.5 text-sm shadow-sm"
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
