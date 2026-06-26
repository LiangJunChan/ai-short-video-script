import { useNavigate } from 'react-router-dom'
import { Collection } from '../types'

interface CollectionSelectorProps {
  collections: Collection[]
  videoCollections: Collection[]
  onAdd: (collectionId: number) => void
}

function CollectionSelector({ collections, videoCollections, onAdd }: CollectionSelectorProps) {
  const navigate = useNavigate()

  const isInCollection = (collectionId: number) => {
    return videoCollections.some((c: Collection) => c.id === collectionId)
  }

  return (
    <div className="p-4 bg-av-bg-secondary rounded-xl border border-av-border-subtle">
      <p className="text-sm font-medium text-av-text-secondary mb-2">选择收藏夹：</p>
      <div className="max-h-32 overflow-y-auto space-y-1">
        {collections.map((col: Collection) => {
          const disabled = isInCollection(col.id)
          return (
            <button
              key={col.id}
              onClick={() => !disabled && onAdd(col.id)}
              disabled={disabled}
              className="w-full text-left px-3 py-2 text-sm hover:bg-av-bg-hover rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {col.icon} {col.name} {disabled ? '(已在收藏)' : `(${col.videoCount})`}
            </button>
          )
        })}
        {collections.length === 0 && (
          <button
            onClick={() => navigate('/library')}
            className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-av-bg-hover rounded-lg transition-colors"
          >
            前往素材库创建收藏夹 →
          </button>
        )}
      </div>
    </div>
  )
}

export default CollectionSelector
