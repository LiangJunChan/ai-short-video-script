import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useSearchVideosQuery,
  useGetSearchHistoryQuery,
  useClearSearchHistoryMutation,
  useGetCollectionsQuery,
  useGetTagsQuery,
  useExportMarkdownMutation,
  useDeleteVideoMutation,
} from '../store/videoApi'
import VideoCard from '../components/VideoCard'
import Loading from '../components/Loading'
import { Collection, Tag, Video } from '../types'

function SearchPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [selectedTagId, setSelectedTagId] = useState<number | undefined>()
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | undefined>()
  const [sortBy, setSortBy] = useState('time_desc')
  const [page, setPage] = useState(1)
  const [showHistory, setShowHistory] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showToast, setShowToast] = useState<string | null>(null)

  const { data: searchResult, isLoading: searching } = useSearchVideosQuery({
    keyword: keyword || undefined,
    tagId: selectedTagId,
    collectionId: selectedCollectionId,
    sort: sortBy,
    page,
    pageSize: 20,
  }, {
    skip: !keyword && !selectedTagId && !selectedCollectionId,
  })

  const { data: historyData } = useGetSearchHistoryQuery(undefined, {
    skip: !showHistory,
  })
  const [clearHistory] = useClearSearchHistoryMutation()
  const [exportMarkdown, { isLoading: isExporting }] = useExportMarkdownMutation()
  const [deleteVideo, { isLoading: isDeleting }] = useDeleteVideoMutation()

  const { data: collectionsData } = useGetCollectionsQuery({ page: 1, pageSize: 100 })
  const { data: tagsData } = useGetTagsQuery({ page: 1, pageSize: 100 })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  const handleHistoryClick = (historyKeyword: string) => {
    setKeyword(historyKeyword)
    setShowHistory(false)
    setPage(1)
  }

  const handleClearHistory = async () => {
    if (!confirm('确定要清空搜索历史吗？')) return
    try {
      await clearHistory().unwrap()
    } catch {
      alert('清空失败')
    }
  }

  const handleFilterChange = (type: 'tag' | 'collection', id: number | null) => {
    if (type === 'tag') {
      setSelectedTagId(id || undefined)
    } else {
      setSelectedCollectionId(id || undefined)
    }
    setPage(1)
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  const toggleSelect = (video: Video) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(video.id)) {
      newSelected.delete(video.id)
    } else {
      newSelected.add(video.id)
    }
    setSelectedIds(newSelected)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  const selectAll = () => {
    const allIds = new Set(searchResult?.data?.videos?.filter(v => v.status === 'done').map(v => v.id) || [])
    setSelectedIds(allIds)
  }

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      alert('请先选择要导出的视频')
      return
    }

    try {
      const blob = await exportMarkdown({ videoIds: Array.from(selectedIds) }).unwrap()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `search-result-export-${new Date().toISOString().slice(0, 10)}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      setShowToast(`成功导出 ${selectedIds.size} 个视频文案`)
      setTimeout(() => setShowToast(null), 3000)
      clearSelection()
    } catch (err: any) {
      alert('导出失败，请重试')
    }
  }

  const hasFilters = keyword || selectedTagId || selectedCollectionId
  const videos = searchResult?.data?.videos || []
  const doneVideos = videos.filter(v => v.status === 'done')
  const hasSelectedDone = Array.from(selectedIds).some(id => 
    videos.find(v => v.id === id)?.status === 'done'
  )

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个视频吗？此操作不可撤销。`)) return

    let successCount = 0
    for (const id of Array.from(selectedIds)) {
      try {
        await deleteVideo(id).unwrap()
        successCount++
      } catch {
        // 失败跳过
      }
    }

    setShowToast(`删除完成，成功删除 ${successCount} 个视频`)
    setTimeout(() => setShowToast(null), 3000)
    clearSelection()
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="border-b border-slate-100">
          <div className="h-16 px-6 flex items-center gap-4">
            <button onClick={() => navigate('/library')} className="text-slate-600 hover:text-slate-900 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-slate-900">搜索素材库</h1>
          </div>
        </div>

        <div className="py-8 px-6">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onFocus={() => setShowHistory(true)}
                onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                className="input-field w-full px-5 py-4 pr-24 text-base rounded-xl"
                placeholder="搜索标题、文案内容..."
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary px-6 py-2.5 text-sm shadow-sm"
              >
                搜索
              </button>
            </div>

            {/* Search History Dropdown */}
            {showHistory && historyData?.data && historyData.data.length > 0 && (
              <div className="absolute mt-2 bg-white border border-slate-100 rounded-xl shadow-lg p-4 z-20 max-w-2xl animate-slide-down">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700">搜索历史</span>
                  <button
                    onClick={handleClearHistory}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    清空
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {historyData.data.map((h: any) => (
                    <button
                      key={h.id}
                      onClick={() => handleHistoryClick(h.keyword)}
                      className="badge hover:bg-slate-100 transition-colors"
                    >
                      {h.keyword}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Collection Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">收藏夹</label>
              <select
                value={selectedCollectionId || ''}
                onChange={(e) => handleFilterChange('collection', e.target.value ? parseInt(e.target.value) : null)}
                className="input-field w-full px-4 py-2.5 text-sm rounded-lg"
              >
                <option value="">全部收藏夹</option>
                {collectionsData?.data?.collections?.map((c: Collection) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            {/* Tag Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">标签</label>
              <select
                value={selectedTagId || ''}
                onChange={(e) => handleFilterChange('tag', e.target.value ? parseInt(e.target.value) : null)}
                className="input-field w-full px-4 py-2.5 text-sm rounded-lg"
              >
                <option value="">全部标签</option>
                {tagsData?.data?.tags?.map((t: Tag) => (
                  <option key={t.id} value={t.id}>#{t.name}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">排序</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value)
                  setPage(1)
                }}
                className="input-field w-full px-4 py-2.5 text-sm rounded-lg"
              >
                <option value="time_desc">最新创建</option>
                <option value="time_asc">最早创建</option>
                <option value="name">按名称排序</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(selectedTagId || selectedCollectionId) && (
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedCollectionId && (
                <span className="badge badge-ice">
                  收藏夹: {collectionsData?.data?.collections?.find((c: Collection) => c.id === selectedCollectionId)?.name}
                  <button onClick={() => handleFilterChange('collection', null)} className="ml-1">×</button>
                </span>
              )}
              {selectedTagId && (
                <span className="badge badge-ice">
                  标签: #{tagsData?.data?.tags?.find((t: Tag) => t.id === selectedTagId)?.name}
                  <button onClick={() => handleFilterChange('tag', null)} className="ml-1">×</button>
                </span>
              )}
            </div>
          )}

          {/* Batch Action Bar */}
          {hasFilters && doneVideos.length > 0 && (
            <div className="flex items-center justify-between mb-6 p-4 bg-sky-50 border border-sky-100 rounded-xl">
              <div className="flex items-center gap-4">
                {!selectMode ? (
                  <button
                    onClick={() => setSelectMode(true)}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    批量选择
                  </button>
                ) : (
                  <>
                    <span className="text-sm text-slate-600">
                      已选择 {selectedIds.size} 个视频
                    </span>
                    <button
                      onClick={selectAll}
                      className="px-3 py-1.5 text-sm text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
                    >
                      全选本页
                    </button>
                    <button
                      onClick={clearSelection}
                      className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      取消
                    </button>
                  </>
                )}
              </div>

              {selectMode && selectedIds.size > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBatchDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? '删除中...' : `删除选中 (${selectedIds.size}个)`}
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={isExporting || !hasSelectedDone}
                    className="btn-primary px-4 py-2 text-sm shadow-sm disabled:opacity-50"
                  >
                    {isExporting ? '导出中...' : `导出Markdown (${selectedIds.size}个)`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {searching ? (
            <div className="flex justify-center py-12">
              <Loading />
            </div>
          ) : hasFilters && searchResult?.data?.videos ? (
            <>
              <p className="text-sm text-slate-500 mb-6">
                找到 <span className="font-medium text-slate-700">{searchResult.data.pagination.total}</span> 个结果
              </p>
              {searchResult.data.videos.length === 0 ? (
                <div className="card p-12 text-center">
                  <p className="text-slate-600">没有找到匹配的视频</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {searchResult.data.videos.map((video: any) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        onClick={() => navigate(`/detail/${video.id}`)}
                        onDelete={() => {}}
                        selected={selectMode ? selectedIds.has(video.id) : undefined}
                        onToggleSelect={selectMode ? toggleSelect : undefined}
                      />
                    ))}
                  </div>

                  {searchResult.data.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-12">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
                      >
                        上一页
                      </button>
                      <span className="text-sm text-slate-500">
                        {page} / {searchResult.data.pagination.totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(searchResult.data.pagination.totalPages, p + 1))}
                        disabled={page === searchResult.data.pagination.totalPages}
                        className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
                      >
                        下一页
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="card p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-slate-600">输入关键词或选择筛选条件开始搜索</p>
            </div>
          )}

          {/* Toast */}
          {showToast && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg z-50 animate-fade-in">
              {showToast}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchPage
