import { createContext, useContext, useCallback, useState, ReactNode } from 'react'

interface MediaViewerContextType {
  openMedia: (url: string, type: 'image' | 'video') => void
}

const MediaViewerContext = createContext<MediaViewerContextType | null>(null)

export function MediaViewerProvider({ children }: { children: ReactNode }) {
  const [viewerState, setViewerState] = useState<{ isOpen: boolean; url: string; type: 'image' | 'video' }>({
    isOpen: false,
    url: '',
    type: 'image',
  })

  const openMedia = useCallback((url: string, type: 'image' | 'video') => {
    setViewerState({ isOpen: true, url, type })
  }, [])

  const closeViewer = useCallback(() => {
    setViewerState(prev => ({ ...prev, isOpen: false }))
  }, [])

  return (
    <MediaViewerContext.Provider value={{ openMedia }}>
      {children}
      {viewerState.isOpen && (
        <div className="fixed inset-0 z-av-modal flex items-center justify-center bg-black/80" onClick={closeViewer}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeViewer}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-2xl font-bold"
            >
              ✕
            </button>
            {viewerState.type === 'image' && (
              <img
                src={viewerState.url}
                alt="preview"
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
            )}
            {viewerState.type === 'video' && (
              <video
                src={viewerState.url}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                controls
                autoPlay
              />
            )}
          </div>
        </div>
      )}
    </MediaViewerContext.Provider>
  )
}

export function useMediaViewer() {
  const context = useContext(MediaViewerContext)
  if (!context) {
    throw new Error('useMediaViewer must be used within MediaViewerProvider')
  }
  return context
}