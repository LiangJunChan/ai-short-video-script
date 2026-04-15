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
  const [showBackTop, setShowBackTop] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'structure' | 'viral_points' | 'tags' | 'rhythm' | 'report'>('structure')
  const [structureResult, setStructureResult] = useState<string | null>(null)
  const [viralPointsResult, setViralPointsResult] = useState<string | null>(null)
  const [tagsResult, setTagsResult] = useState<string | null>(null)
  const [rhythmResult, setRhythmResult] = useState<string | null>(null)
  const [reportResult, setReportResult] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // V1.6 Material Library
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

  // Restore analysis results on load
  useEffect(() => {
    if (analysisResultsData?.data) {
      const results = analysisResultsData.data
      if (results.structure) setStructureResult(results.structure)
      if (results.viral_points) setViralPointsResult(results.viral_points)
      if (results.tags) setTagsResult(results.tags)
      if (results.rhythm) setRhythmResult(results.rhythm)
      if (results.report) setReportResult(results.report)
    }
  }, [analysisResultsData])

  // Scroll to show/hide back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

  // V1.6 Collection Management
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

  // V1.6 Tag Management
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
        refetchMe()
      } else {
        showToast(result.message || '重新提取失败')
      }
    } catch (err: any) {
      showToast(err.data?.message || '网络错误，请重试')
    }
  }

  const handleRewrite = async () => {
    if (!rewritePrompt.trim()) {
      showToast('请输入改写要求')
      return
    }

    try {
      const result = await rewriteVideoText({ id: numericId, prompt: rewritePrompt }).unwrap()
      if (result.code === 200) {
        setRewriteResult(result.data?.text || '')
        refetchMe()
        showToast('改写完成')
      } else {
        showToast(result.message || '改写失败')
      }
    } catch (err: any) {
      if (err.data?.code === 402) {
        showToast(err.data.message || '积分不足，改写需要10积分')
      } else {
        showToast(err.data?.message || '网络错误，请重试')
      }
    }
  }

  const handleAnalyze = async (type: 'structure' | 'viral_points' | 'tags' | 'rhythm' | 'report') => {
    setIsAnalyzing(true)
    try {
      const result = await analyzeVideo({ id: numericId, analysisType: type }).unwrap()
      if (result.code === 200) {
        const analysisResult = result.data.result
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
        refetchMe()
        showToast('分析完成')
      } else {
        showToast(result.message || '分析失败')
      }
    } catch (err: any) {
      if (err.data?.code === 402) {
        showToast(err.data.message || '积分不足')
      } else {
        showToast(err.data?.message || '网络错误，请重试')
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteVideo(numericId).unwrap()
      showToast('删除成功')
      navigate('/')
    } catch {
      showToast('删除失败，请重试')
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

  const tabs = [
    { key: 'structure' as const, label: '文案结构', icon: '📐' },
    { key: 'viral_points' as const, label: '爆款分析', icon: '🔥' },
    { key: 'tags' as const, label: '选题标签', icon: '🏷️' },
    { key: 'rhythm' as const, label: '口播节奏', icon: '🎵' },
    { key: 'report' as const, label: '完整报告', icon: '📊' },
  ]

  const getAnalysisResult = (tab: typeof activeTab) => {
    switch (tab) {
      case 'structure': return structureResult
      case 'viral_points': return viralPointsResult
      case 'tags': return tagsResult
      case 'rhythm': return rhythmResult
      case 'report': return reportResult
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-32">
            <Loading />
          </div>
        </div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-32">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-50 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-slate-600 mb-6">视频不存在或加载失败</p>
            <button
              className="btn-secondary px-6 py-2.5 text-sm"
              onClick={() => navigate('/')}
            >
              返回列表
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Top Bar - no sticky, scroll后会显示返回顶部按钮 */}
        <div className="flex justify-between items-center h-14 px-6 py-4">
          <button
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            onClick={() => navigate('/')}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            返回列表
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            onClick={() => setShowDeleteModal(true)}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            删除
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8 px-6">
          {/* Left: Video Player */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-6">
              {/* Video */}
              <div className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shadow-sm">
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
                <h1 className="text-xl font-semibold text-slate-900 mb-2">{video.title}</h1>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span>{formatDate(video.createdAt)}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"/>
                  <span>{video.uploader}</span>
                </div>
              </div>

              {/* Status Badge */}
              {video.status !== 'done' && (
                <div className={`p-4 rounded-xl border ${
                  video.status === 'processing' 
                    ? 'bg-sky-50 border-sky-100 text-sky-700' 
                    : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                  <p className="text-sm">{getStatusText()}</p>
                </div>
              )}

              {/* Material Management - moved below video */}
              <div className="card p-5">
                <h2 className="text-base font-semibold text-slate-900 mb-4">素材管理</h2>

                <div className="space-y-4">
                  {/* Collections */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-700">收藏夹</span>
                      <button
                        onClick={() => setShowCollectionSelector(!showCollectionSelector)}
                        className="text-sm text-sky-600 hover:text-sky-700 font-medium"
                      >
                        {showCollectionSelector ? '取消' : '+ 添加'}
                      </button>
                    </div>

                    {videoCollectionsData?.data && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {videoCollectionsData.data.length === 0 ? (
                          <span className="text-sm text-slate-400">未添加到任何收藏夹</span>
                        ) : (
                          videoCollectionsData.data.map((col: Collection) => (
                            <div key={col.id} className="group inline-flex items-center gap-1.5">
                              <span className="badge badge-ice">
                                {col.icon} {col.name}
                              </span>
                              <button
                                onClick={() => handleRemoveFromCollection(col.id)}
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
                    )}

                    {showCollectionSelector && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-sm font-medium text-slate-700 mb-2">选择收藏夹：</p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {collectionsData?.data?.collections?.map((col: Collection) => {
                            const isInCollection = videoCollectionsData?.data?.some((c: Collection) => c.id === col.id)
                            return (
                              <button
                                key={col.id}
                                onClick={() => !isInCollection && handleAddToCollection(col.id)}
                                disabled={isInCollection}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {col.icon} {col.name} {isInCollection ? '(已在收藏)' : `(${col.videoCount})`}
                              </button>
                            )
                          })}
                          {collectionsData?.data?.collections?.length === 0 && (
                            <button
                              onClick={() => navigate('/library')}
                              className="w-full text-left px-3 py-2 text-sm text-sky-600 hover:bg-white rounded-lg transition-colors"
                            >
                              前往素材库创建收藏夹 →
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-700">标签</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {videoTagsData?.data ? (
                        videoTagsData.data.length === 0 ? (
                          <span className="text-sm text-slate-400">还没有添加标签</span>
                        ) : (
                          videoTagsData.data.map((tag: Tag) => (
                            <div key={tag.id} className="group inline-flex items-center gap-1.5">
                              <span className="badge badge-ice">#{tag.name}</span>
                              <button
                                onClick={() => handleRemoveTag(tag.id)}
                                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                                </svg>
                              </button>
                            </div>
                          ))
                        )
                      ) : null}
                    </div>

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
                        className="input-field w-full px-4 py-2.5 text-sm"
                        placeholder="输入标签名称，回车添加..."
                      />
                      {showTagSuggestions && tagSuggestionsData?.data && tagSuggestionsData.data.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-lg p-3 z-10 animate-slide-down">
                          <div className="flex flex-wrap gap-1.5">
                            {tagSuggestionsData.data.map((tag: Tag) => (
                              <button
                                key={tag.id}
                                onClick={() => handleAddTag(tag.name)}
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
                </div>
              </div>
            </div>
          </div>

          {/* Right: AI Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* AI Extracted Text */}
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-900">AI 提取文案</h2>
                <div className="flex gap-2">
                  {video.status === 'done' && video.aiText && (
                    <button
                      className="btn-secondary px-3 py-1.5 text-xs"
                      onClick={() => handleCopy(video.aiText!)}
                    >
                      复制
                    </button>
                  )}
                  <button
                    className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
                    onClick={handleReextract}
                    disabled={isReextracting || video.status === 'processing'}
                  >
                    {isReextracting ? '提取中...' : '重新提取'}
                  </button>
                </div>
              </div>

              {video.status !== 'done' ? (
                <div className="text-center py-12 text-sm text-slate-500">
                  {getStatusText()}
                </div>
              ) : video.aiText ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {video.aiText}
                  </div>
                </div>
              ) : null}
            </div>

            {/* AI Rewrite */}
            {video.status === 'done' && video.aiText && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">AI 改写</h2>

                <div className="flex gap-3 mb-4">
                  <textarea
                    className="input-field flex-1 px-4 py-3 text-sm resize-none leading-relaxed"
                    placeholder="输入改写要求，如：更简洁、口语化、突出重点..."
                    value={rewritePrompt}
                    onChange={(e) => setRewritePrompt(e.target.value)}
                    rows={2}
                  />
                  <button
                    className="btn-primary px-5 py-3 text-sm whitespace-nowrap disabled:opacity-50 shadow-sm"
                    onClick={handleRewrite}
                    disabled={isRewriting || !rewritePrompt.trim() || video.rewriteStatus === 'rewriting'}
                  >
                    {isRewriting ? '改写中...' : '改写'}
                  </button>
                </div>

                {(rewriteResult || video.rewrittenText) && (
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">改写结果</span>
                      <button
                        className="btn-secondary px-3 py-1.5 text-xs"
                        onClick={() => handleCopy(rewriteResult || video.rewrittenText!)}
                      >
                        复制
                      </button>
                    </div>
                    <div className="p-4 bg-sky-50 rounded-xl border border-sky-100">
                      <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {rewriteResult || video.rewrittenText}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Deep Analysis */}
            {video.status === 'done' && video.aiText && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">AI 深度分析</h2>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-slate-50 rounded-xl mb-4">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === tab.key
                          ? 'bg-white text-sky-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="mr-1">{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Analysis Content */}
                <div className="min-h-[200px]">
                  {getAnalysisResult(activeTab) ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                        {getAnalysisResult(activeTab)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sky-50 flex items-center justify-center">
                        <svg className="w-8 h-8 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 16v-4M12 8h.01" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <p className="text-sm text-slate-600 mb-4">还没有进行分析</p>
                      <button
                        className="btn-primary px-6 py-2.5 text-sm shadow-sm"
                        onClick={() => handleAnalyze(activeTab)}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? '分析中...' : `开始${tabs.find(t => t.key === activeTab)?.label}分析`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showDeleteModal && (
        <DeleteModal
          message="确定要删除这个视频吗？此操作不可撤销。"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {toast && <Toast message={toast} />}

      {/* Back to Top Button */}
      {showBackTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-12 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-50"
          title="返回顶部"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}

export default DetailPage
