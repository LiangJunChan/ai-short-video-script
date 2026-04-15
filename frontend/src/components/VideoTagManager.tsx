import { Tag } from '../types'

interface VideoTagManagerProps {
  videoTags: Tag[]
  newTagName: string
  showTagSuggestions: boolean
  tagSuggestions: Tag[]
  onNewTagNameChange: (value: string) => void
  onShowTagSuggestionsChange: (value: boolean) => void
  onAddTag: (tagName: string) => void
  onRemoveTag: (tagId: number) => void
}

function VideoTagManager({
  videoTags,
  newTagName,
  showTagSuggestions,
  tagSuggestions,
  onNewTagNameChange,
  onShowTagSuggestionsChange,
  onAddTag,
  onRemoveTag,
}: VideoTagManagerProps) {
  return (
    <div className="pt-4 border-t border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-700">标签</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {videoTags.length === 0 ? (
          <span className="text-sm text-slate-400">还没有添加标签</span>
        ) : (
          videoTags.map((tag: Tag) => (
            <div key={tag.id} className="group inline-flex items-center gap-1.5">
              <span className="badge badge-ice">#{tag.name}</span>
              <button
                onClick={() => onRemoveTag(tag.id)}
                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => onNewTagNameChange(e.target.value)}
          onFocus={() => onShowTagSuggestionsChange(true)}
          onBlur={() => setTimeout(() => onShowTagSuggestionsChange(false), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTagName.trim()) {
              onAddTag(newTagName.trim())
            }
          }}
          className="input-field w-full px-4 py-2.5 text-sm"
          placeholder="输入标签名称，回车添加..."
        />
        {showTagSuggestions && tagSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-lg p-3 z-10 animate-slide-down">
            <div className="flex flex-wrap gap-1.5">
              {tagSuggestions.map((tag: Tag) => (
                <button
                  key={tag.id}
                  onClick={() => onAddTag(tag.name)}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-sky-50 hover:text-sky-600 rounded-lg text-sm transition-colors"
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoTagManager
