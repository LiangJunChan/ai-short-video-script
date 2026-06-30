import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { videoApi } from '../store/videoApi'

export default function StoryboardListPage() {
  const navigate = useNavigate()
  const [page] = useState(1)
  const { data, isLoading, refetch } = videoApi.useGetStoryboardListQuery({ page, pageSize: 20 })
  const [createStoryboard] = videoApi.useCreateStoryboardMutation()
  const [deleteStoryboard] = videoApi.useDeleteStoryboardMutation()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  const storyboards = data?.data?.storyboards || []

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const result = await createStoryboard({ name: newName.trim() }).unwrap()
      setShowCreate(false)
      setNewName('')
      navigate(`/storyboard/${result.data.id}`)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('确定删除这个画布吗？')) return
    try {
      await deleteStoryboard(id).unwrap()
      refetch()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-av-bg-primary">
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="heading-lg gradient-text"
              style={{ marginBottom: 'var(--space-2)' }}
            >
              脚本工作台
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              管理和编辑你的AI短视频脚本
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-gradient-primary flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
            style={{ border: 'none' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>新建脚本</span>
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-av-text-tertiary">加载中...</p>
        ) : storyboards.length === 0 ? (
          // Empty State CTA
          <div
            className="mt-10 rounded-xl p-8 flex flex-col items-center text-center"
            style={{
              backgroundColor: 'rgba(22, 24, 34, 0.5)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--color-primary-muted)' }}
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--color-primary)' }}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              还没有脚本？创建你的第一个AI短视频脚本
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-gradient-primary px-5 py-2 rounded-lg text-sm font-semibold mt-3 cursor-pointer"
              style={{ border: 'none' }}
            >
              开始创建
            </button>
          </div>
        ) : (
          // Storyboard List
          <div className="flex flex-col gap-4">
            {storyboards.map((sb) => (
              <div
                key={sb.id}
                onClick={() => navigate(`/storyboard/${sb.id}`)}
                className="storyboard-card rounded-xl p-5 flex items-center justify-between cursor-pointer group"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Status Dot — 业务兼容：根据 status 字段显示（默认 success 表示已完成） */}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 status-glow"
                    style={{ backgroundColor: 'var(--state-success)' }}
                  />
                  <div className="min-w-0">
                    <h3
                      className="text-sm font-semibold truncate"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {sb.name}
                    </h3>
                    <p
                      className="text-sm truncate mt-0.5"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      更新于 {new Date(sb.updatedAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  {/* Actions (hover) — 业务保留：仅删除按钮 */}
                  <div className="card-actions flex items-center gap-1">
                    <button
                      onClick={(e) => handleDelete(e, sb.id)}
                      className="ghost-btn px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                      style={{
                        color: 'var(--state-error)',
                        border: '1px solid var(--color-border-subtle)',
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-av-modal flex items-center justify-center bg-[rgba(8,9,13,0.7)] backdrop-blur-sm animate-fade-in">
          <div className="surface neon-border rounded-xl p-6 w-96 animate-scale-in">
            <h2 className="text-lg font-semibold mb-4 text-av-text-primary">新建画布</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="输入画布名称"
              className="input-field w-full px-3 py-2 text-sm mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="btn-secondary px-4 py-2 text-sm">
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
