import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  useGetCollectionDetailQuery,
  useRemoveVideoFromCollectionMutation,
  useExportMarkdownMutation,
} from '../store/videoApi'
import VideoCard from '../components/VideoCard'
import ConfirmModal from '../components/ConfirmModal'
import type { Video } from '../types'

function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const collectionId = parseInt(id || '0')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showToast, setShowToast] = useState<string | null>(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<{show: boolean, videoId: number}>({show: false, videoId: 0})
  const [showBatchRemoveConfirm, setShowBatchRemoveConfirm] = useState(false)

  const { data, isLoading } = useGetCollectionDetailQuery(collectionId)
  const [removeVideo] = useRemoveVideoFromCollectionMutation()
  const [exportMarkdown, { isLoading: isExporting }] = useExportMarkdownMutation()

  const confirmRemoveVideo = async () => {
    const videoId = showRemoveConfirm.videoId
    setShowRemoveConfirm({show: false, videoId: 0})
    try {
      await removeVideo({ collectionId, videoId }).unwrap()
      // 如果移除的是已选中的，从选中集合中移除
      if (selectedIds.has(videoId)) {
        const newSelected = new Set(selectedIds)
        newSelected.delete(videoId)
        setSelectedIds(newSelected)
      }
    } catch (err: any) {
      alert(err.data?.message || '移除失败')
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
      const collectionName = data?.data?.collection?.name || 'collection'
      a.download = `${collectionName}-export-${new Date().toISOString().slice(0, 10)}.md`
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
        <div className="text-slate-500">加载中...</div>
      </div>
    )
  }

  if (!data?.data?.collection) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto text-center py-32">
          <p className="text-slate-600 mb-6">收藏夹不存在</p>
          <button onClick={() => navigate('/library')} className="btn-secondary px-6 py-2.5 text-sm">
            返回素材库
          </button>
        </div>
      </div>
    )
  }

  const { collection, videos, pagination } = data.data
  const doneVideos = videos.filter(v => v.status === 'done')
  const hasSelectedDone = Array.from(selectedIds).some(id => 
    videos.find(v => v.id === id)?.status === 'done'
  )

  const confirmBatchRemove = async () => {
    setShowBatchRemoveConfirm(false)
    let successCount = 0
    for (const videoId of Array.from(selectedIds)) {
      try {
        await removeVideo({ collectionId, videoId }).unwrap()
        if (selectedIds.has(videoId)) {
          const newSelected = new Set(selectedIds)
          newSelected.delete(videoId)
          setSelectedIds(newSelected)
        }
        successCount++
      } catch {
        // 失败跳过
      }
    }

    setShowToast(`移除完成，成功移除 ${successCount} 个视频`)
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
            <div className="flex items-center gap-3">
              {collection.icon && <span className="text-2xl">{collection.icon}</span>}
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{collection.name}</h1>
                <p className="text-sm text-slate-500">{collection.videoCount} 个视频</p>
              </div>
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
                  onClick={() => setShowBatchRemoveConfirm(true)}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading ? '移除中...' : `移出收藏夹 (${selectedIds.size}个)`}
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
              <p className="text-slate-600">收藏夹还没有视频</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {videos.map((video) => (
                  <div key={video.id} className="relative group">
                    <VideoCard
                      video={video}
                      onClick={() => navigate(`/detail/${video.id}`)}
                      onDelete={() => {}}
                      selected={selectMode ? selectedIds.has(video.id) : undefined}
                      onToggleSelect={selectMode ? toggleSelect : undefined}
                    />
                    <button
                      onClick={() => setShowRemoveConfirm({show: true, videoId: video.id})}
                      className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm hover:bg-red-50 hover:text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-slate-400"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
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

        {/* Remove Single Video Confirm */}
        {showRemoveConfirm.show && (
          <ConfirmModal
            title="移除收藏"
            message="确定要从收藏夹移除这个视频吗？"
            onConfirm={confirmRemoveVideo}
            onCancel={() => setShowRemoveConfirm({show: false, videoId: 0})}
            confirmText="移除"
            confirmButtonType="danger"
          />
        )}

        {/* Batch Remove Confirm */}
        {showBatchRemoveConfirm && (
          <ConfirmModal
            title="批量移出收藏夹"
            message={`确定要从收藏夹移出选中的 ${selectedIds.size} 个视频吗？`}
            onConfirm={confirmBatchRemove}
            onCancel={() => setShowBatchRemoveConfirm(false)}
            confirmText="移出"
            confirmButtonType="danger"
          />
        )}
      </div>
    </div>
  )
}

export default CollectionDetailPage
