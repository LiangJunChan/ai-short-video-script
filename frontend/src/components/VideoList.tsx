import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetVideoListQuery, useDeleteVideoMutation, useExportMarkdownMutation } from '../store/videoApi'
import VideoCard from './VideoCard'
import Loading from './Loading'
import DeleteModal from './DeleteModal'
import ConfirmModal from './ConfirmModal'
import type { Video } from '../types'

function VideoList() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const pageSize = 12
  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showToast, setShowToast] = useState<string | null>(null)
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)

  const { data, isLoading, isError } = useGetVideoListQuery({ page, pageSize })
  const [deleteVideo, { isLoading: isDeleting }] = useDeleteVideoMutation()
  const [exportMarkdown, { isLoading: isExporting }] = useExportMarkdownMutation()

  const videos = data?.data?.videos ?? []
  const pagination = data?.data?.pagination

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      await deleteVideo(deleteTarget.id).unwrap()
      setDeleteTarget(null)
      // 如果删除的是已选中的，从选中集合中移除
      if (selectedIds.has(deleteTarget.id)) {
        const newSelected = new Set(selectedIds)
        newSelected.delete(deleteTarget.id)
        setSelectedIds(newSelected)
      }
    } catch {
      alert('删除失败，请重试')
    }
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

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      alert('请先选择要导出的视频')
      return
    }

    try {
      const blob = await exportMarkdown({ videoIds: Array.from(selectedIds) }).unwrap()
      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-short-video-export-${new Date().toISOString().slice(0, 10)}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      setShowToast(`成功导出 ${selectedIds.size} 个视频文案`)
      setTimeout(() => setShowToast(null), 3000)
      // 清除选择
      clearSelection()
    } catch (err: any) {
      alert('导出失败，请重试')
    }
  }

  const selectAll = () => {
    const allIds = new Set(videos.filter(v => v.status === 'done').map(v => v.id))
    setSelectedIds(allIds)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loading />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-24">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-slate-600">加载失败，请刷新重试</p>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-50 flex items-center justify-center">
          <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" opacity="0.3"/>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">还没有视频</h3>
        <p className="text-slate-500 mb-6">上传视频或通过链接提取开始使用</p>
      </div>
    )
  }

  const hasSelectedDone = Array.from(selectedIds).some(id => 
    videos.find(v => v.id === id)?.status === 'done'
  )

  const confirmBatchDelete = async () => {
    setShowBatchDeleteConfirm(false)
    // 逐个删除
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
    <div>
      {/* Batch Action Bar */}
      {videos.some(v => v.status === 'done') && (
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

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onClick={() => navigate(`/detail/${video.id}`)}
            onDelete={(v) => setDeleteTarget(v)}
            selected={selectMode ? selectedIds.has(video.id) : undefined}
            onToggleSelect={selectMode ? toggleSelect : undefined}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            上一页
          </button>

          <span className="px-4 py-2 text-sm text-slate-500">
            {page} / {pagination.totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            下一页
          </button>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          message="确定要删除这个视频吗？此操作不可撤销。"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* Batch Delete Confirm Modal */}
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

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg z-50 animate-fade-in">
          {showToast}
        </div>
      )}
    </div>
  )
}

export default VideoList
