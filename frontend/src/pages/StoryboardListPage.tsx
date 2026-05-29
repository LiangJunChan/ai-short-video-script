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
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-sm text-slate-500 hover:text-slate-900">
              ← 返回首页
            </button>
            <h1 className="text-lg font-semibold text-slate-900">我的脚本</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors"
          >
            新建画布
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {isLoading ? (
          <p className="text-sm text-slate-400">加载中...</p>
        ) : storyboards.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 mb-4">还没有脚本</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-sky-500 text-white text-sm rounded-lg hover:bg-sky-600"
            >
              创建第一个画布
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storyboards.map((sb) => (
              <div
                key={sb.id}
                onClick={() => navigate(`/storyboard/${sb.id}`)}
                className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">{sb.name}</h3>
                  <button
                    onClick={(e) => handleDelete(e, sb.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  更新于 {new Date(sb.updatedAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">新建画布</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="输入画布名称"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-sky-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-500">
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-4 py-2 bg-sky-500 text-white text-sm rounded-lg hover:bg-sky-600 disabled:opacity-50"
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
