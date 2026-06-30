import { useState } from 'react'
import type { Video } from '@/types'

interface VideoCardProps {
  video: Video
  onClick: () => void
  onDelete: (video: Video) => void
  selected?: boolean
  onToggleSelect?: (video: Video) => void
}

const gradientClasses = [
  'thumb-gradient-1',
  'thumb-gradient-2',
  'thumb-gradient-3',
  'thumb-gradient-4',
  'thumb-gradient-5',
]
const patternClasses = ['thumb-pattern', 'thumb-pattern-2']

function VideoCard({ video, onClick, onDelete, selected, onToggleSelect }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  // 通过 video.id 派生一个稳定但不同的 gradient/pattern index
  const seed = (video.id ?? 0) + (video.title?.length ?? 0)
  const gradient = gradientClasses[seed % 5]
  const pattern = patternClasses[seed % 2]

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

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleSelect?.(video)
  }

  // 状态徽章类名
  const statusClass =
    video.status === 'done'
      ? 'status-done'
      : video.status === 'processing'
        ? 'status-processing'
        : video.status === 'failed'
          ? 'status-failed'
          : ''
  const statusText =
    video.status === 'done'
      ? '已完成'
      : video.status === 'processing'
        ? '处理中'
        : video.status === 'failed'
          ? '提取失败'
          : ''

  // 缩略图兜底：与设计稿对齐的居中视频图标
  const fallbackThumb = (
    <div className={`w-full h-full ${gradient} ${pattern}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ color: 'rgba(255,255,255,0.15)' }}
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <polygon points="10,8 16,12 10,16" fill="currentColor" opacity="0.2" />
        </svg>
      </div>
    </div>
  )

  return (
    <article
      className={`video-card rounded-xl overflow-hidden cursor-pointer ${
        isHovered || selected ? 'neon-border' : ''
      }`}
      style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-subtle)',
        boxShadow: isHovered || selected ? 'var(--shadow-glow)' : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
          fallbackThumb
        )}

        {/* Bottom gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bottom-gradient pointer-events-none" />

        {/* Checkbox（左上角，选择模式） */}
        {onToggleSelect && (
          <div
            className={`checkbox-card ${selected ? 'checked' : ''}`}
            onClick={handleCheckboxClick}
            role="checkbox"
            aria-checked={selected ?? false}
            aria-label={`选择视频 ${video.title}`}
          >
            {selected && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        )}

        {/* Status badge（右上角） */}
        {statusText && (
          <span className={`status-badge ${statusClass}`}>{statusText}</span>
        )}

        {/* Delete button（右上角，hover 显示，非选择模式） */}
        {!onToggleSelect && (
          <button
            className="delete-card-btn"
            onClick={handleDeleteClick}
            aria-label="删除视频"
            title="删除视频"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3
          className="font-medium text-sm text-av-text-primary truncate"
          title={video.title}
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {truncateText(video.title, 24)}
        </h3>
        <div className="text-xs text-av-text-tertiary mt-1">
          {formatDate(video.createdAt)}
        </div>
      </div>
    </article>
  )
}

export default VideoCard
