import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetVideoListQuery, useDeleteVideoMutation, useExportMarkdownMutation } from '../store/videoApi'
import VideoCard from './VideoCard'
import Loading from './Loading'
import DeleteModal from './DeleteModal'
import ConfirmModal from './ConfirmModal'
import Toast from './Toast'
import Pagination from './Pagination'
import type { Video } from '../types'

interface VideoListProps {
  onUpload?: () => void
}

function VideoList({ onUpload }: VideoListProps) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const pageSize = 12
  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showToast, setShowToast] = useState<string | null>(null)
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)

  // 列表页也强制 refetchOnMountOrArgChange:从详情页返回列表时刷新最新 status,
  // 避免主页看到的还是旧的 "处理中" 卡片。
  // 另外只要列表里有 processing 卡片,每 5s 轮询一次让状态实时更新
  const [pollInterval, setPollInterval] = useState(0)
  const { data, isLoading, isError } = useGetVideoListQuery(
    { page, pageSize },
    { refetchOnMountOrArgChange: true, pollingInterval: pollInterval }
  )
  const videos = data?.data?.videos ?? []
  const pagination = data?.data?.pagination

  useEffect(() => {
    setPollInterval(videos.some(v => v.status === 'processing') ? 5000 : 0)
  }, [videos])

  const [deleteVideo, { isLoading: isDeleting }] = useDeleteVideoMutation()
  const [exportMarkdown, { isLoading: isExporting }] = useExportMarkdownMutation()

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
    } catch {
      alert('导出失败，请重试')
    }
  }

  const selectAll = () => {
    const allIds = new Set(videos.filter(v => v.status === 'done').map(v => v.id))
    setSelectedIds(allIds)
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
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-av-state-error/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-av-state-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-av-text-secondary">加载失败，请刷新重试</p>
      </div>
    )
  }

  // 空状态
  if (videos.length === 0) {
    return (
      <div>
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="heading-lg gradient-text">我的视频</h1>
            <span className="sort-label">还没有视频</span>
          </div>
        </div>

        <div className="empty-state">
          <div className="empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" opacity="0.3"/>
            </svg>
          </div>
          <h3 className="empty-title">还没有视频</h3>
          <p className="empty-desc">上传视频或通过链接提取开始使用</p>
          {onUpload && (
            <button className="empty-cta" onClick={onUpload}>
              上传视频
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="heading-lg gradient-text">我的视频</h1>
          <span className="sort-label">最近上传</span>
        </div>
        {videos.some(v => v.status === 'done') && (
          <button
            className={`batch-select-btn ${selectMode ? 'is-active' : ''}`}
            onClick={() => (selectMode ? clearSelection() : setSelectMode(true))}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            {selectMode ? '退出选择' : '批量选择'}
          </button>
        )}
      </div>

      {/* Batch Action Bar（仅选择模式显示） */}
      {selectMode && (
        <div className="batch-action-bar animate-slide-down">
          <span className="batch-count">已选择 {selectedIds.size} 个</span>
          <div className="batch-actions">
            <button className="batch-ghost primary-ghost" onClick={selectAll}>
              全选
            </button>
            <button className="batch-ghost secondary-ghost" onClick={clearSelection}>
              取消
            </button>
            {selectedIds.size > 0 && (
              <>
                <span className="batch-divider" />
                <button
                  className="error-btn"
                  onClick={() => setShowBatchDeleteConfirm(true)}
                  disabled={isDeleting}
                >
                  {isDeleting ? '删除中...' : `删除选中(${selectedIds.size})`}
                </button>
                <button
                  className="batch-export-btn"
                  onClick={handleExport}
                  disabled={isExporting || !hasSelectedDone}
                >
                  {isExporting ? '导出中...' : '导出MD'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
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
        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
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
      {showToast && <Toast message={showToast} />}
    </div>
  )
}

export default VideoList
