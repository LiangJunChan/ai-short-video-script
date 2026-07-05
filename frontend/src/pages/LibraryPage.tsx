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
    <div className="min-h-screen bg-av-bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Header */}
        <div className="page-header">
          <h1
            className="heading-lg gradient-text"
            style={{ textWrap: 'balance', wordBreak: 'keep-all' }}
          >
            素材库
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-gradient-primary text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
            style={{ color: 'var(--color-text-inverse)', border: 'none' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            新建收藏夹
          </button>
        </div>

        {/* 3-Column Layout: Collections (3/4) + Tags Sidebar (1/4) */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Collections Section */}
          <section className="flex-1 min-w-0" style={{ flex: 3 }}>
            <h2 className="heading-md mb-5" style={{ color: 'var(--color-text-primary)' }}>收藏夹</h2>

            {collectionsLoading ? (
              <div className="text-center py-16 text-av-text-tertiary">加载中...</div>
            ) : !collectionsData?.data?.collections || collectionsData.data.collections.length === 0 ? (
              <div className="rounded-2xl surface shadow-av-sm p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-av-text-secondary mb-4">还没有收藏夹</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary px-6 py-2 text-sm shadow-av-sm hover:shadow-av-glow transition-shadow duration-200"
                >
                  创建第一个收藏夹
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {collectionsData.data.collections.map((collection: Collection) => (
                  <div
                    key={collection.id}
                    className="collection-card surface rounded-xl p-5 cursor-pointer group"
                    onClick={() => navigate(`/library/collections/${collection.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {collection.icon && (
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                            style={{ background: 'var(--color-bg-tertiary)' }}
                          >
                            {collection.icon}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold mt-0 mb-1" style={{ color: 'var(--color-text-primary)' }}>
                            {collection.name}
                          </h3>
                          {collection.description && (
                            <p
                              className="text-sm mb-3 truncate"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {collection.description}
                            </p>
                          )}
                          <div
                            className="flex items-center gap-1.5 text-xs"
                            style={{ color: 'var(--color-text-tertiary)' }}
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <span>{collection.videoCount} 个视频</span>
                          </div>
                        </div>
                      </div>
                      <button
                        className="delete-btn p-1.5 rounded-lg transition-colors duration-200 cursor-pointer flex-shrink-0"
                        style={{
                          color: 'var(--color-text-tertiary)',
                          background: 'transparent',
                          border: 'none',
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCollection(collection.id, collection.name)
                        }}
                        title="删除收藏夹"
                        aria-label="删除收藏夹"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {collectionsData && collectionsData.data.pagination.totalPages > 1 && (
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
                  {page} / {collectionsData.data.pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(collectionsData.data.pagination.totalPages, p + 1))}
                  disabled={page === collectionsData.data.pagination.totalPages}
                  className="px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer"
                  style={{
                    color: page === collectionsData.data.pagination.totalPages ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border-subtle)',
                    background: 'transparent',
                    opacity: page === collectionsData.data.pagination.totalPages ? 0.5 : 1,
                    cursor: page === collectionsData.data.pagination.totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  下一页
                </button>
              </div>
            )}
          </section>

          {/* Tags Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-6" style={{ flex: 1 }}>
            <div>
              <h2 className="heading-md mb-4" style={{ color: 'var(--color-text-primary)' }}>标签</h2>
              {tagsLoading ? (
                <div className="text-center py-12 text-av-text-tertiary">加载中...</div>
              ) : !tagsData?.data?.tags || tagsData.data.tags.length === 0 ? (
                <div
                  className="neon-border-accent rounded-xl p-4"
                  style={{ background: 'var(--color-bg-secondary)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>还没有标签</p>
                  <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>在视频详情页添加标签</p>
                </div>
              ) : (
                <div
                  className="neon-border-accent rounded-xl p-4"
                  style={{ background: 'var(--color-bg-secondary)' }}
                >
                  <div className="flex flex-wrap gap-2">
                    {tagsData.data.tags.map((tag: Tag) => (
                      <div key={tag.id} className="group inline-flex items-center">
                        <button
                          onClick={() => navigate(`/library/tags/${tag.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors duration-200"
                          style={{
                            background: 'var(--color-bg-tertiary)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          #{tag.name}
                          <span className="text-xs opacity-60">({tag.usageCount})</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTag(tag.id, tag.name)
                          }}
                          className="ml-1 text-av-text-tertiary hover:text-av-state-error opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`删除标签 ${tag.name}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Search Card */}
            <button
              onClick={() => navigate('/library/search')}
              className="rounded-xl p-4 cursor-pointer w-full text-left transition-colors duration-200"
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-default)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--color-accent-muted)' }}
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
                    搜索素材库
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    关键词、标签、收藏夹
                  </p>
                </div>
              </div>
            </button>
          </aside>
        </div>
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-av-modal flex items-center justify-center bg-[rgba(8,9,13,0.7)] backdrop-blur-sm animate-fade-in">
          <div className="surface neon-border rounded-xl shadow-av-floating w-full max-w-md mx-4 animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-av-border-subtle">
              <h2 className="text-xl font-semibold text-av-text-primary">创建收藏夹</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-av-text-tertiary hover:text-primary hover:bg-av-bg-hover rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-av-text-secondary mb-2">名称</label>
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
                <label className="block text-sm font-medium text-av-text-secondary mb-2">图标（可选）</label>
                <input
                  type="text"
                  value={newCollection.icon}
                  onChange={(e) => setNewCollection({ ...newCollection, icon: e.target.value })}
                  className="input-field w-full px-4 py-3 text-sm"
                  placeholder="输入emoji，例如：💄"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-av-text-secondary mb-2">描述（可选）</label>
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
                  className="flex-1 btn-primary py-2.5 text-sm shadow-av-sm"
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
