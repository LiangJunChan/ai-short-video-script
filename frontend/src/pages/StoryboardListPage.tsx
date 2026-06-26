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
      <header className="sticky top-0 z-av-sticky glass border-b border-av-border-subtle">
        <div className="flex items-center justify-between h-16 px-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-sm text-av-text-secondary hover:text-av-text-primary transition-colors">
              ← 返回首页
            </button>
            <h1 className="text-lg font-semibold text-av-text-primary">我的脚本</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary px-4 py-2 text-sm font-medium"
          >
            新建画布
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {isLoading ? (
          <p className="text-sm text-av-text-tertiary">加载中...</p>
        ) : storyboards.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-av-text-tertiary mb-4">还没有脚本</p>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary px-4 py-2 text-sm"
            >
              创建第一个画布
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {storyboards.map((sb) => (
              <div
                key={sb.id}
                onClick={() => navigate(`/storyboard/${sb.id}`)}
                className="storyboard-card surface rounded-xl p-5 flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0 status-glow" style={{ backgroundColor: 'var(--state-success)' }} />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate text-av-text-primary">{sb.name}</h3>
                    <p className="text-sm truncate mt-0.5 text-av-text-secondary">
                      更新于 {new Date(sb.updatedAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <div className="card-actions flex items-center gap-1" style={{ opacity: 0 }}>
                    <button
                      onClick={(e) => handleDelete(e, sb.id)}
                      className="ghost-btn px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ color: 'var(--state-error)', border: '1px solid var(--color-border-subtle)' }}
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
