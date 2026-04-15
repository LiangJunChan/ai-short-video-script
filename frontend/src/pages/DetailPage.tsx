import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useGetVideoDetailQuery,
  useReextractVideoMutation,
  useRewriteVideoTextMutation,
  useDeleteVideoMutation,
  useGetMeQuery,
  useAnalyzeVideoMutation,
  useGetAnalysisResultsQuery,
  useGetVideoCollectionsQuery,
  useAddVideoToCollectionMutation,
  useRemoveVideoFromCollectionMutation,
  useGetCollectionsQuery,
  useGetVideoTagsQuery,
  useAddTagToVideoMutation,
  useRemoveTagFromVideoMutation,
  useSearchTagsQuery,
} from '../store/videoApi'
import Loading from '../components/Loading'
import Toast from '../components/Toast'
import DeleteModal from '../components/DeleteModal'
import { Collection, Tag } from '../types'

function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const numericId = Number(id)

  const [toast, setToast] = useState<string | null>(null)
  const [rewritePrompt, setRewritePrompt] = useState('')
  const [rewriteResult, setRewriteResult] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'structure' | 'viral_points' | 'tags' | 'rhythm' | 'report'>('structure')
  const [structureResult, setStructureResult] = useState<string | null>(null)
  const [viralPointsResult, setViralPointsResult] = useState<string | null>(null)
  const [tagsResult, setTagsResult] = useState<string | null>(null)
  const [rhythmResult, setRhythmResult] = useState<string | null>(null)
  const [reportResult, setReportResult] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // V1.6 素材库相关状态
  const [showCollectionSelector, setShowCollectionSelector] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  const { data: videoCollectionsData } = useGetVideoCollectionsQuery(numericId, { skip: !numericId })
  const { data: collectionsData } = useGetCollectionsQuery({ page: 1, pageSize: 100 })
  const { data: videoTagsData } = useGetVideoTagsQuery(numericId, { skip: !numericId })
  const { data: tagSuggestionsData } = useSearchTagsQuery(newTagName, { skip: !newTagName || newTagName.length < 1 })

  const [addVideoToCollection] = useAddVideoToCollectionMutation()
  const [removeVideoFromCollection] = useRemoveVideoFromCollectionMutation()
  const [addTagToVideo] = useAddTagToVideoMutation()
  const [removeTagFromVideo] = useRemoveTagFromVideoMutation()

  const { data, isLoading } = useGetVideoDetailQuery(numericId)
  const { refetch: refetchMe } = useGetMeQuery()
  const [reextractVideo, { isLoading: isReextracting }] = useReextractVideoMutation()
  const [rewriteVideoText, { isLoading: isRewriting }] = useRewriteVideoTextMutation()
  const [deleteVideo] = useDeleteVideoMutation()
  const [analyzeVideo] = useAnalyzeVideoMutation()
  const { data: analysisResultsData } = useGetAnalysisResultsQuery(numericId)

  const video = data?.data

  // 页面加载时，恢复已有的分析结果
  useEffect(() => {
    if (analysisResultsData?.data) {
      const results = analysisResultsData.data
      if (results.structure) {
        setStructureResult(results.structure)
      }
      if (results.viral_points) {
        setViralPointsResult(results.viral_points)
      }
      if (results.tags) {
        setTagsResult(results.tags)
      }
      if (results.rhythm) {
        setRhythmResult(results.rhythm)
      }
      if (results.report) {
        setReportResult(results.report)
      }
    }
  }, [analysisResultsData])

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast('文案已复制')
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      showToast('文案已复制')
    }
  }

  // V1.6 收藏夹管理
  const handleAddToCollection = async (collectionId: number) => {
    try {
      await addVideoToCollection({ collectionId, videoId: numericId }).unwrap()
      showToast('已添加到收藏夹')
      setShowCollectionSelector(false)
    } catch (err: any) {
      showToast(err.data?.message || '添加失败')
    }
  }

  const handleRemoveFromCollection = async (collectionId: number) => {
    try {
      await removeVideoFromCollection({ collectionId, videoId: numericId }).unwrap()
      showToast('已从收藏夹移除')
    } catch (err: any) {
      showToast(err.data?.message || '移除失败')
    }
  }

  // V1.6 标签管理
  const handleAddTag = async (tagName: string) => {
    if (!tagName.trim()) return
    try {
      await addTagToVideo({ videoId: numericId, tagName }).unwrap()
      setNewTagName('')
      setShowTagSuggestions(false)
      showToast('标签已添加')
    } catch (err: any) {
      showToast(err.data?.message || '添加标签失败')
    }
  }

  const handleRemoveTag = async (tagId: number) => {
    try {
      await removeTagFromVideo({ videoId: numericId, tagId }).unwrap()
      showToast('标签已移除')
    } catch (err: any) {
      showToast(err.data?.message || '移除标签失败')
    }
  }

  const handleReextract = async () => {
    try {
      const result = await reextractVideo(numericId).unwrap()
      if (result.code === 200) {
        showToast('已开始重新提取文案')
        refetchMe() // 刷新用户积分
      } else {
        showToast(result.message || '重新提取失败')
      }
    } catch (err: any) {
      if (err.data?.code === 402) {
        showToast(err.data.message || '积分不足，重新提取需要5积分，请充值后再试')
      } else if (err.data?.message) {
        showToast(err.data.message)
      } else {
        showToast('网络错误，请重试')
      }
    }
  }

  const handleRewrite = async () => {
    if (!rewritePrompt.trim()) {
      showToast('请输入改写提示词')
      return
    }
    if (!video?.aiText) {
      showToast('没有可改写的原文案')
      return
    }

    try {
      const result = await rewriteVideoText({ id: numericId, prompt: rewritePrompt }).unwrap()
      if (result.code === 200) {
        setRewriteResult(result.data?.text ?? null)
        refetchMe() // 刷新用户积分
        showToast('改写成功')
      } else {
        showToast(result.message || '改写失败')
      }
    } catch (err: any) {
      if (err.data?.code === 402) {
        showToast(err.data.message || '积分不足，AI改写需要10积分，请充值后再试')
      } else if (err.data?.message) {
        showToast(err.data.message)
      } else {
        showToast('网络错误，请重试')
      }
    }
  }

  const handleDelete = async () => {
    try {
      const result = await deleteVideo(numericId).unwrap()
      if (result.code === 200) {
        showToast('删除成功')
        navigate('/')
      } else {
        showToast(result.message || '删除失败')
      }
    } catch {
      showToast('网络错误，请重试')
    }
    setShowDeleteModal(false)
  }

  const handleAnalyze = async (type: string) => {
    if (!video?.aiText) {
      showToast('没有原文案可供分析')
      return
    }

    setIsAnalyzing(true)

    try {
      const result = await analyzeVideo({ id: numericId, analysisType: type as any }).unwrap()
      if (result.code === 200) {
        const analysisResult = result.data?.result
        // 根据类型设置对应state
        switch (type) {
          case 'structure':
            setStructureResult(analysisResult)
            break
          case 'viral_points':
            setViralPointsResult(analysisResult)
            break
          case 'tags':
            setTagsResult(analysisResult)
            break
          case 'rhythm':
            setRhythmResult(analysisResult)
            break
          case 'report':
            setReportResult(analysisResult)
            break
        }
        if (!result.data?.fromCache) {
          refetchMe()
        }
      } else {
        showToast(result.message || '分析失败')
      }
    } catch (err: any) {
      if (err.data?.code === 402) {
        showToast(err.data.message || '积分不足')
      } else if (err.data?.message) {
        showToast(err.data.message)
      } else {
        showToast('网络错误，请重试')
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

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
    if (!video) return ''
    switch (video.status) {
      case 'processing':
        return '正在提取文案，请稍候...'
      case 'failed':
        return '当前视频暂无法提取文案，请尝试上传清晰且包含中文语音的视频'
      default:
        return ''
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-12">
        <Loading />
      </div>
    )
  }

  if (!video) {
    return (
      <div className="max-w-5xl mx-auto px-12">
        <div className="text-center py-32">
          <p className="text-sm font-light text-[#666] mb-8">视频不存在或加载失败</p>
          <button
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-[#e5e5e5] rounded-lg text-sm font-medium text-[#666] hover:border-black hover:text-black transition-colors"
            onClick={() => navigate('/')}
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            返回列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-12">
      {/* Back bar */}
      <div className="flex justify-between items-center py-8">
        <button
          className="inline-flex items-center gap-1.5 text-sm text-[#000] hover:text-[#666] transition-colors"
          onClick={() => navigate('/')}
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          返回列表
        </button>
        <button
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#e5e5e5] rounded-lg text-sm font-medium text-[#666] hover:border-[#dc2626] hover:text-[#dc2626] transition-colors"
          onClick={() => setShowDeleteModal(true)}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          删除视频
        </button>
      </div>

      {/* Left-Right Layout */}
      <div className="flex gap-12 pb-16">
        {/* Left: Video */}
        <div className="w-[360px] flex-shrink-0">
          <video
            className="w-full rounded-xl bg-[#F5F0E8]"
            style={{ aspectRatio: '9/16', maxHeight: '640px' }}
            src={video.videoUrl}
            controls
            playsInline
          />
          {/* Video info below */}
          <div className="mt-6">
            <h1 className="text-xl font-normal mb-2" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.01em' }}>
              {video.title}
            </h1>
            <div className="flex items-center gap-2 text-sm font-light text-[#999]">
              <span>{formatDate(video.createdAt)}</span>
              <span className="opacity-40">·</span>
              <span>{video.uploader}</span>
            </div>
          </div>
        </div>

        {/* Right: Text panels */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* V1.6 素材管理 */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-normal mb-4" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.01em' }}>
              素材管理
            </h2>
            
            <div className="space-y-4">
              {/* 收藏夹管理 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">收藏夹</span>
                  <button
                    onClick={() => setShowCollectionSelector(!showCollectionSelector)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showCollectionSelector ? '取消' : '+ 添加到收藏夹'}
                  </button>
                </div>
                
                {videoCollectionsData?.data ? (
                  <div className="flex flex-wrap gap-2">
                    {videoCollectionsData.data.length === 0 ? (
                      <span className="text-sm text-gray-500">未添加到任何收藏夹</span>
                    ) : (
                      videoCollectionsData.data.map((col: Collection) => (
                        <div key={col.id} className="group inline-flex items-center gap-1">
                          <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                            {col.icon} {col.name}
                          </span>
                          <button
                            onClick={() => handleRemoveFromCollection(col.id)}
                            className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}

                {/* 收藏夹选择器 */}
                {showCollectionSelector && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">选择收藏夹：</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {collectionsData?.data?.collections?.map((col: Collection) => {
                        const isInCollection = videoCollectionsData?.data?.some((c: Collection) => c.id === col.id)
                        return (
                          <button
                            key={col.id}
                            onClick={() => !isInCollection && handleAddToCollection(col.id)}
                            disabled={isInCollection}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {col.icon} {col.name} {isInCollection ? '(已在收藏)' : `(${col.videoCount})`}
                          </button>
                        )
                      })}
                      {collectionsData?.data?.collections?.length === 0 && (
                        <button
                          onClick={() => navigate('/library')}
                          className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-gray-200 rounded"
                        >
                          前往素材库创建收藏夹
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 标签管理 */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">标签</span>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {videoTagsData?.data ? (
                    videoTagsData.data.length === 0 ? (
                      <span className="text-sm text-gray-500">还没有添加标签</span>
                    ) : (
                      videoTagsData.data.map((tag: Tag) => (
                        <div key={tag.id} className="group inline-flex items-center gap-1">
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                            #{tag.name}
                          </span>
                          <button
                            onClick={() => handleRemoveTag(tag.id)}
                            className="text-blue-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )
                  ) : null}
                </div>

                {/* 添加标签输入框 */}
                <div className="relative">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onFocus={() => setShowTagSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTagName.trim()) {
                        handleAddTag(newTagName.trim())
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入标签名称，回车添加..."
                  />
                  {showTagSuggestions && tagSuggestionsData?.data && tagSuggestionsData.data.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                      <div className="flex flex-wrap gap-1">
                        {tagSuggestionsData.data.map((tag: Tag) => (
                          <button
                            key={tag.id}
                            onClick={() => handleAddTag(tag.name)}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                          >
                            #{tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI 提取文案 */}
          <div className="bg-[#fafafa] rounded-xl p-6">
            <div className="flex justify-between items-baseline mb-4">
              <h2 className="text-lg font-normal" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.01em' }}>
                AI 提取文案
              </h2>
              <div className="flex gap-2">
                {video.status === 'done' && video.aiText && (
                  <button
                    className="px-3 py-1 border border-[#e5e5e5] rounded-lg text-xs font-medium text-[#666] hover:border-black hover:text-black transition-colors"
                    onClick={() => handleCopy(video.aiText!)}
                  >
                    复制
                  </button>
                )}
                <button
                  className="px-3 py-1 border border-[#e5e5e5] rounded-lg text-xs font-medium text-[#666] hover:border-black hover:text-black transition-colors disabled:opacity-40"
                  onClick={handleReextract}
                  disabled={isReextracting || video.status === 'processing'}
                >
                  {isReextracting || video.status === 'processing' ? '提取中...' : '重新提取'}
                </button>
              </div>
            </div>

            {video.status === 'processing' && (
              <div className="text-center py-10 text-sm font-light text-[#999]">
                {getStatusText()}
              </div>
            )}
            {video.status === 'failed' && (
              <div className="text-center py-10 text-sm font-light text-[#999]">
                {getStatusText()}
              </div>
            )}
            {video.status === 'done' && video.aiText && (
              <div className="text-sm leading-relaxed font-light text-[#000] whitespace-pre-wrap max-h-[280px] overflow-y-auto">
                {video.aiText}
              </div>
            )}
          </div>

          {/* AI 改写 */}
          {video.status === 'done' && video.aiText && (
            <div className="bg-[#fafafa] rounded-xl p-6">
              <div className="mb-4">
                <h2 className="text-lg font-normal" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.01em' }}>
                  AI 改写
                </h2>
              </div>

              <div className="flex gap-3 items-start">
                <textarea
                  className="flex-1 px-4 py-3 border border-[#e5e5e5] rounded-lg text-sm font-light outline-none focus:border-black transition-colors resize-none leading-relaxed"
                  placeholder="输入改写要求，如：更简洁、口语化、突出重点..."
                  value={rewritePrompt}
                  onChange={(e) => setRewritePrompt(e.target.value)}
                  rows={2}
                />
                <button
                  className="px-5 py-3 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity whitespace-nowrap disabled:opacity-40"
                  onClick={handleRewrite}
                  disabled={isRewriting || !rewritePrompt.trim() || video.rewriteStatus === 'rewriting'}
                >
                  {isRewriting || video.rewriteStatus === 'rewriting' ? '改写中...' : '改写'}
                </button>
              </div>

              {(rewriteResult || video.rewrittenText) && (
                <div className="mt-5 pt-5 border-t border-[#e5e5e5]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-medium text-[#999] uppercase tracking-wider">改写结果</span>
                    <button
                      className="px-3 py-1 border border-[#e5e5e5] rounded text-xs font-medium text-[#666] hover:border-black hover:text-black transition-colors"
                      onClick={() => handleCopy(rewriteResult || video.rewrittenText!)}
                    >
                      复制
                    </button>
                  </div>
                  <div className="text-sm leading-relaxed font-light text-[#333] whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {rewriteResult || video.rewrittenText}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI 深度分析 */}
          {video.status === 'done' && video.aiText && (
            <div className="bg-[#fafafa] rounded-xl p-6">
              <div className="mb-4">
                <h2 className="text-lg font-normal" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.01em' }}>
                  AI 深度分析
                </h2>
              </div>

              {/* Tab 横向导航 */}
              <div className="flex border-b border-[#e5e5e5] mb-4">
                <button
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'structure'
                      ? 'border-black text-black'
                      : 'border-transparent text-[#666] hover:text-black'
                  }`}
                  onClick={() => setActiveTab('structure')}
                >
                  文案结构分析
                </button>
                <button
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'viral_points'
                      ? 'border-black text-black'
                      : 'border-transparent text-[#666] hover:text-black'
                  }`}
                  onClick={() => setActiveTab('viral_points')}
                >
                  爆款点提炼
                </button>
                <button
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'tags'
                      ? 'border-black text-black'
                      : 'border-transparent text-[#666] hover:text-black'
                  }`}
                  onClick={() => setActiveTab('tags')}
                >
                  选题标签
                </button>
                <button
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'rhythm'
                      ? 'border-black text-black'
                      : 'border-transparent text-[#666] hover:text-black'
                  }`}
                  onClick={() => setActiveTab('rhythm')}
                >
                  口播节奏
                </button>
                <button
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'report'
                      ? 'border-black text-black'
                      : 'border-transparent text-[#666] hover:text-black'
                  }`}
                  onClick={() => setActiveTab('report')}
                >
                  完整报告
                </button>
              </div>

              {/* 内容区 */}
              <div className="min-h-[200px] flex items-center justify-center">
                {isAnalyzing ? (
                  /* 加载中 */
                  <div className="text-center py-8 text-sm text-[#999]">
                    分析中，请稍候...
                  </div>
                ) : (
                  /* 根据 activeTab 显示对应内容 */
                  <div className="w-full">
                    {/* 文案结构分析 */}
                    {activeTab === 'structure' && !structureResult && (
                      <div className="text-center py-8">
                        <button
                          className="px-6 py-3 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                          onClick={() => handleAnalyze('structure')}
                        >
                          生成AI分析（消耗5积分）
                        </button>
                      </div>
                    )}
                    {activeTab === 'structure' && structureResult && (
                      <div className="bg-white rounded-lg p-4 border border-[#e5e5e5]">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-medium text-[#999]">文案结构分析结果</span>
                          <button
                            className="px-3 py-1 border border-[#e5e5e5] rounded text-xs font-medium text-[#666] hover:border-black hover:text-black transition-colors"
                            onClick={() => handleCopy(structureResult)}
                          >
                            复制
                          </button>
                        </div>
                        <div className="text-sm leading-relaxed text-[#333] whitespace-pre-wrap">
                          {structureResult}
                        </div>
                      </div>
                    )}

                    {/* 爆款点提炼 */}
                    {activeTab === 'viral_points' && !viralPointsResult && (
                      <div className="text-center py-8">
                        <button
                          className="px-6 py-3 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                          onClick={() => handleAnalyze('viral_points')}
                        >
                          生成AI分析（消耗3积分）
                        </button>
                      </div>
                    )}
                    {activeTab === 'viral_points' && viralPointsResult && (
                      <div className="bg-white rounded-lg p-4 border border-[#e5e5e5]">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-medium text-[#999]">爆款点提炼结果</span>
                          <button
                            className="px-3 py-1 border border-[#e5e5e5] rounded text-xs font-medium text-[#666] hover:border-black hover:text-black transition-colors"
                            onClick={() => handleCopy(viralPointsResult)}
                          >
                            复制
                          </button>
                        </div>
                        <div className="text-sm leading-relaxed text-[#333] whitespace-pre-wrap">
                          {viralPointsResult}
                        </div>
                      </div>
                    )}

                    {/* 选题标签 */}
                    {activeTab === 'tags' && !tagsResult && (
                      <div className="text-center py-8">
                        <button
                          className="px-6 py-3 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                          onClick={() => handleAnalyze('tags')}
                        >
                          生成AI分析（消耗2积分）
                        </button>
                      </div>
                    )}
                    {activeTab === 'tags' && tagsResult && (
                      <div className="bg-white rounded-lg p-4 border border-[#e5e5e5]">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-medium text-[#999]">选题标签结果</span>
                          <button
                            className="px-3 py-1 border border-[#e5e5e5] rounded text-xs font-medium text-[#666] hover:border-black hover:text-black transition-colors"
                            onClick={() => handleCopy(tagsResult)}
                          >
                            复制
                          </button>
                        </div>
                        <div className="text-sm leading-relaxed text-[#333] whitespace-pre-wrap">
                          {tagsResult}
                        </div>
                      </div>
                    )}

                    {/* 口播节奏 */}
                    {activeTab === 'rhythm' && !rhythmResult && (
                      <div className="text-center py-8">
                        <button
                          className="px-6 py-3 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                          onClick={() => handleAnalyze('rhythm')}
                        >
                          生成AI分析（消耗4积分）
                        </button>
                      </div>
                    )}
                    {activeTab === 'rhythm' && rhythmResult && (
                      <div className="bg-white rounded-lg p-4 border border-[#e5e5e5]">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-medium text-[#999]">口播节奏分析结果</span>
                          <button
                            className="px-3 py-1 border border-[#e5e5e5] rounded text-xs font-medium text-[#666] hover:border-black hover:text-black transition-colors"
                            onClick={() => handleCopy(rhythmResult)}
                          >
                            复制
                          </button>
                        </div>
                        <div className="text-sm leading-relaxed text-[#333] whitespace-pre-wrap">
                          {rhythmResult}
                        </div>
                      </div>
                    )}

                    {/* 完整报告 */}
                    {activeTab === 'report' && !reportResult && (
                      <div className="text-center py-8">
                        <button
                          className="px-6 py-3 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer"
                          onClick={() => handleAnalyze('report')}
                        >
                          生成完整报告（消耗6积分）
                        </button>
                      </div>
                    )}
                    {activeTab === 'report' && reportResult && (
                      <div className="bg-white rounded-lg p-4 border border-[#e5e5e5]">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-medium text-[#999]">完整分析报告</span>
                          <button
                            className="px-3 py-1 border border-[#e5e5e5] rounded text-xs font-medium text-[#666] hover:border-black hover:text-black transition-colors"
                            onClick={() => handleCopy(reportResult)}
                          >
                            复制
                          </button>
                        </div>
                        <div className="text-sm leading-relaxed text-[#333] whitespace-pre-wrap">
                          {reportResult}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast} />}
      {showDeleteModal && (
        <DeleteModal
          title="确认删除"
          message={`确定要删除视频「${video.title}」吗？此操作不可恢复。`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}

export default DetailPage
