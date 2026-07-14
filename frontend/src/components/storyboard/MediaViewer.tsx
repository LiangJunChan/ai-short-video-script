import { useEffect, useCallback } from 'react'

interface MediaViewerProps {
  isOpen: boolean
  onClose: () => void
  mediaUrl: string
  mediaType: 'image' | 'video'
}

export default function MediaViewer({ isOpen, onClose, mediaUrl, mediaType }: MediaViewerProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-av-modal flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white text-2xl font-bold"
        >
          ✕
        </button>
        {mediaType === 'image' && (
          <img
            src={mediaUrl}
            alt="preview"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
        )}
        {mediaType === 'video' && (
          <video
            src={mediaUrl}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            controls
            autoPlay
          />
        )}
      </div>
    </div>
  )
}