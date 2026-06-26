import { useState } from 'react'
import {
  useGetVideoCollectionsQuery,
  useGetCollectionsQuery,
  useGetVideoTagsQuery,
  useAddVideoToCollectionMutation,
  useRemoveVideoFromCollectionMutation,
  useAddTagToVideoMutation,
  useRemoveTagFromVideoMutation,
  useSearchTagsQuery,
} from '../store/videoApi'
import { Collection, Video } from '../types'
import CollectionSelector from './CollectionSelector'
import VideoTagManager from './VideoTagManager'

interface VideoBasicInfoProps {
  video: Video
  videoId: number
  onToast: (msg: string) => void
}

function VideoBasicInfo({ video, videoId, onToast }: VideoBasicInfoProps) {
  // V1.6 Material Library
  const [showCollectionSelector, setShowCollectionSelector] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  const { data: videoCollectionsData } = useGetVideoCollectionsQuery(videoId, { skip: !videoId })
  const { data: collectionsData } = useGetCollectionsQuery({ page: 1, pageSize: 100 })
  const { data: videoTagsData } = useGetVideoTagsQuery(videoId, { skip: !videoId })
  const { data: tagSuggestionsData } = useSearchTagsQuery(newTagName, { skip: !newTagName || newTagName.length < 1 })

  const [addVideoToCollection] = useAddVideoToCollectionMutation()
  const [removeVideoFromCollection] = useRemoveVideoFromCollectionMutation()
  const [addTagToVideo] = useAddTagToVideoMutation()
  const [removeTagFromVideo] = useRemoveTagFromVideoMutation()

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  const getStatusText = () => {
    switch (video.status) {
      case 'processing':
        return '正在提取文案，请稍候...'
      case 'failed':
        return '当前视频暂无法提取文案，请尝试上传清晰且包含中文语音的视频'
      default:
        return ''
    }
  }

  // V1.6 Collection Management
  const handleAddToCollection = async (collectionId: number) => {
    try {
      await addVideoToCollection({ collectionId, videoId }).unwrap()
      onToast('已添加到收藏夹')
      setShowCollectionSelector(false)
    } catch (err: any) {
      onToast(err.data?.message || '添加失败')
    }
  }

  const handleRemoveFromCollection = async (collectionId: number) => {
    try {
      await removeVideoFromCollection({ collectionId, videoId }).unwrap()
      onToast('已从收藏夹移除')
    } catch (err: any) {
      onToast(err.data?.message || '移除失败')
    }
  }

  // V1.6 Tag Management
  const handleAddTag = async (tagName: string) => {
    if (!tagName.trim()) return
    try {
      await addTagToVideo({ videoId, tagName }).unwrap()
      setNewTagName('')
      setShowTagSuggestions(false)
      onToast('标签已添加')
    } catch (err: any) {
      onToast(err.data?.message || '添加标签失败')
    }
  }

  const handleRemoveTag = async (tagId: number) => {
    try {
      await removeTagFromVideo({ videoId, tagId }).unwrap()
      onToast('标签已移除')
    } catch (err: any) {
      onToast(err.data?.message || '移除标签失败')
    }
  }

  return (
    <div className="sticky top-32 space-y-6">
      {/* Video */}
      <div className="rounded-2xl overflow-hidden bg-av-bg-secondary border border-av-border-subtle shadow-av-sm">
        <video
          className="w-full"
          style={{ aspectRatio: '9/16' }}
          src={video.videoUrl}
          controls
          playsInline
        />
      </div>

      {/* Info */}
      <div>
        <h1 className="text-xl font-semibold text-av-text-primary mb-2">{video.title}</h1>
        <div className="flex items-center gap-3 text-sm text-av-text-secondary">
          <span>{formatDate(video.createdAt)}</span>
          <span className="w-1 h-1 rounded-full bg-av-border-strong"/>
          <span>{video.uploader}</span>
        </div>
      </div>

      {/* Status Badge */}
      {video.status !== 'done' && (
        <div className={`p-4 rounded-xl border ${
          video.status === 'processing'
            ? 'bg-primary/10 border-av-border-subtle text-primary'
            : 'bg-av-state-error/10 border-av-border-subtle text-av-state-error'
        }`}>
          <p className="text-sm">{getStatusText()}</p>
        </div>
      )}

      {/* Material Management */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-av-text-primary mb-4">素材管理</h2>

        <div className="space-y-4">
          {/* Collections */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-av-text-secondary">收藏夹</span>
              <button
                onClick={() => setShowCollectionSelector(!showCollectionSelector)}
                className="text-sm text-primary hover:text-primary-hover font-medium"
              >
                {showCollectionSelector ? '取消' : '+ 添加'}
              </button>
            </div>

            {videoCollectionsData?.data && (
              <div className="flex flex-wrap gap-2 mb-3">
                {videoCollectionsData.data.length === 0 ? (
                  <span className="text-sm text-av-text-tertiary">未添加到任何收藏夹</span>
                ) : (
                  videoCollectionsData.data.map((col: Collection) => (
                    <div key={col.id} className="group inline-flex items-center gap-1.5">
                      <span className="badge badge-ice">
                        {col.icon} {col.name}
                      </span>
                      <button
                        onClick={() => handleRemoveFromCollection(col.id)}
                        className="text-av-text-tertiary hover:text-av-state-error opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {showCollectionSelector && (
              <CollectionSelector
                collections={collectionsData?.data?.collections || []}
                videoCollections={videoCollectionsData?.data || []}
                onAdd={handleAddToCollection}
              />
            )}
          </div>

          {/* Tags */}
          <VideoTagManager
            videoTags={videoTagsData?.data || []}
            newTagName={newTagName}
            showTagSuggestions={showTagSuggestions}
            tagSuggestions={tagSuggestionsData?.data || []}
            onNewTagNameChange={setNewTagName}
            onShowTagSuggestionsChange={setShowTagSuggestions}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
          />
        </div>
      </div>
    </div>
  )
}

export default VideoBasicInfo
