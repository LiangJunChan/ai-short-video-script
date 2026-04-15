import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useGetTagVideosQuery, useGetTagsQuery, useExportMarkdownMutation, useDeleteVideoMutation } from '../store/videoApi'
import VideoCard from '../components/VideoCard'
import Loading from '../components/Loading'
import ConfirmModal from '../components/ConfirmModal'
import type { Video } from '../types'

function TagFilterPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const tagId = parseInt(id || '0')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showToast, setShowToast] = useState<string | null>(null)
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)

  const { data, isLoading } = useGetTagVideosQuery({ tagId, page, pageSize: 20 })
  const { data: tagsData } = useGetTagsQuery({ page: 1, pageSize: 1 })
  const [exportMarkdown, { isLoading: isExporting }] = useExportMarkdownMutation()
  const [deleteVideo, { isLoading: isDeleting }] = useDeleteVideoMutation()

  let tagName: string | null = null
  if (tagsData?.data?.tags) {
    const tag = tagsData.data.tags.find(t => t.id === tagId)
    if (tag) tagName = tag.name
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
    const allIds = new Set(data?.data?.videos?.filter(v => v.status === 'done').map(v => v.id) || [])
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
      a.download = `tag-${tagName || 'export'}-${new Date().toISOString().slice(0, 10)}.md`
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center py-32">
        <Loading />
      </div>
    )
  }

  if (!data?.data?.videos) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto text-center py-32">
          <p className="text-slate-600 mb-6">标签不存在</p>
          <button onClick={() => navigate('/library')} className="btn-secondary px-6 py-2.5 text-sm">
            返回素材库
          </button>
        </div>
      </div>
    )
  }

  const { videos, pagination } = data.data
  const doneVideos = videos.filter(v => v.status === 'done')
  const hasSelectedDone = Array.from(selectedIds).some(id => 
    videos.find(v => v.id === id)?.status === 'done'
  )

  const confirmBatchDelete = async () => {
    setShowBatchDeleteConfirm(false)
    let successCount = 0
    for (const id of Array.from(selectedIds)) {
      try {
        await deleteVideo(id).unwrap()
        if (selectedIds.has(id)) {
          const newSelected = new Set(selectedIds)
          newSelected.delete(id)
          setSelectedIds(newSelected)
        }
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
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                <span className="text-sky-500">#</span>{tagName || '标签'}
              </h1>
              <p className="text-sm text-slate-500">{pagination.total} 个视频</p>
            </div>
          </div>
        </div>

        {/* Batch Action Bar */}
        {doneVideos.length > 0 && (
          <div className="flex items-center justify-between mx-6 my-4 p-4 bg-sky-50 border border-sky-100 rounded-xl">
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
                  onClick={() => setShowBatchDeleteConfirm(true)}
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

        {/* Videos */}
        <div className="py-4 px-6">
          {videos.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-slate-600">这个标签下还没有视频</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {videos.map((video) => (
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

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <span className="text-sm text-slate-500">{page} / {pagination.totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Toast */}
        {showToast && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg z-50 animate-fade-in">
            {showToast}
          </div>
        )}

        {/* Batch Delete Confirm */}
        {showBatchDeleteConfirm && (
          <ConfirmModal
            title="批量删除"
            message={`确定要删除选中的 ${selectedIds.size} 个视频吗？\n此操作不可撤销。`}
            onConfirm={confirmBatchDelete}
            onCancel={() => setShowBatchDeleteConfirm(false)}
            confirmText="删除"
            isLoading={isDeleting}
            confirmButtonType="danger"
          />
        )}
      </div>
    </div>
  )
}

export default TagFilterPage
