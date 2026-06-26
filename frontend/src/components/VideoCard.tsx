import type { Video } from '@/types'

interface VideoCardProps {
  video: Video
  onClick: () => void
  onDelete: (video: Video) => void
  selected?: boolean
  onToggleSelect?: (video: Video) => void
}

function VideoCard({ video, onClick, onDelete, selected, onToggleSelect }: VideoCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`

    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}-${day}`
  }

  const truncateText = (text: string, maxLength: number) => {
    if (!text || text.length <= maxLength) return text || ''
    return text.substring(0, maxLength) + '...'
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(video)
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onToggleSelect?.(video)
  }

  return (
    <div
      className={`group rounded-xl border overflow-hidden transition-all duration-300 cursor-pointer ${
        selected
          ? 'border-primary/40 ring-2 ring-primary/30 bg-av-bg-elevated'
          : 'border-av-border-subtle bg-av-bg-secondary hover:border-primary/20 hover:shadow-av-glow hover:-translate-y-1'
      }`}
      onClick={onClick}
    >
      {/* Thumbnail - 9:16 */}
      <div className="relative bg-av-bg-tertiary" style={{ aspectRatio: '9/16' }}>
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            className="w-full h-full object-cover"
            alt={video.title}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-av-bg-elevated flex items-center justify-center">
              <svg className="w-8 h-8 text-av-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" opacity="0.5"/>
              </svg>
            </div>
          </div>
        )}

        {/* Bottom gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bottom-gradient pointer-events-none" />

        {/* Checkbox (when in select mode) */}
        {onToggleSelect && (
          <div
            className="absolute top-3 left-3 w-6 h-6 bg-av-bg-elevated/90 backdrop-blur-sm rounded-lg shadow-av-sm flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={selected ?? false}
              onChange={handleCheckboxChange}
              className="w-4 h-4 text-primary rounded focus:ring-primary/50 border-av-border-strong"
            />
          </div>
        )}

        {/* Status Badge */}
        {video.status === 'processing' && (
          <div className={`absolute top-3 ${onToggleSelect ? 'left-12' : 'left-3'} bg-av-bg-elevated/80 backdrop-blur-sm text-primary text-xs font-medium px-2.5 py-1.5 rounded-full shadow-av-sm`}>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot"/>
              <span>处理中</span>
            </div>
          </div>
        )}

        {video.status === 'failed' && (
          <div className={`absolute top-3 ${onToggleSelect ? 'left-12' : 'left-3'} bg-av-bg-elevated/80 backdrop-blur-sm text-av-state-error text-xs font-medium px-2.5 py-1.5 rounded-full shadow-av-sm`}>
            提取失败
          </div>
        )}

        {/* Rewrite Status Badge */}
        {video.rewriteStatus === 'done' && (
          <div className="absolute top-3 right-3 bg-av-bg-elevated/80 backdrop-blur-sm text-av-state-success text-xs font-medium px-2.5 py-1.5 rounded-full shadow-av-sm">
            已改写
          </div>
        )}

        {/* Delete button */}
        <button
          className="absolute top-3 right-3 w-8 h-8 bg-av-bg-elevated/80 backdrop-blur-sm hover:bg-av-state-error/20 hover:text-av-state-error rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-av-sm hover:scale-110"
          onClick={handleDeleteClick}
          title="删除视频"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-sm text-av-text-primary truncate mb-1.5" title={video.title}>
          {truncateText(video.title, 24)}
        </h3>
        <div className="flex items-center gap-2 text-xs text-av-text-tertiary">
          <span>{formatDate(video.createdAt)}</span>
          <span className="w-1 h-1 rounded-full bg-av-text-tertiary"/>
          <span className="truncate">{video.uploader}</span>
        </div>
      </div>
    </div>
  )
}

export default VideoCard
