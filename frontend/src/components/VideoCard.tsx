import type { Video } from '@/types'

interface VideoCardProps {
  video: Video
  onClick: () => void
  onDelete: (video: Video) => void
}

function VideoCard({ video, onClick, onDelete }: VideoCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(video)
  }

  return (
    <div
      className="bg-white/80 backdrop-blur-glass rounded-xl overflow-hidden border border-border-glass shadow-glass hover:shadow-glass-hover hover:border-accent/30 transition-all duration-240 cursor-pointer group"
      onClick={onClick}
    >
      {/* Thumbnail - 竖屏 9:16 */}
      <div
        className="relative bg-[#F5F0E8] overflow-hidden"
        style={{ aspectRatio: '9/16' }}
      >
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            className="w-full h-full object-cover"
            alt={video.title}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-[#ccc]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
            </svg>
          </div>
        )}

        {/* Processing badge */}
        {video.status === 'processing' && (
          <div className="absolute top-2 left-2 bg-primary/80 backdrop-blur text-white text-xs px-2 py-1 rounded-lg">
            提取文案中
          </div>
        )}

        {/* Delete button */}
        <button
          className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDeleteClick}
          title="删除视频"
        >
          <svg
            className="w-4 h-4 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Video info */}
      <div className="p-4">
        <h3
          className="font-heading font-medium text-sm text-primary truncate"
          title={video.title}
        >
          {truncateText(video.title, 22)}
        </h3>
        <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
          <span>{formatDate(video.createdAt)}</span>
          <span>·</span>
          <span>{video.uploader}</span>
        </div>
      </div>
    </div>
  )
}

export default VideoCard
