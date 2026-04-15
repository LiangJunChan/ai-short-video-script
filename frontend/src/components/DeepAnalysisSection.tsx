import { useState, useEffect } from 'react'
import {
  useAnalyzeVideoMutation,
  useGetAnalysisResultsQuery,
} from '../store/videoApi'

interface DeepAnalysisSectionProps {
  videoId: number
  onToast: (msg: string) => void
  onCopy: (text: string) => Promise<void>
  onRefetchUser: () => void
}

type AnalysisTab = 'structure' | 'viral_points' | 'tags' | 'rhythm' | 'report'

function DeepAnalysisSection({ videoId, onToast, onCopy, onRefetchUser }: DeepAnalysisSectionProps) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('structure')
  const [structureResult, setStructureResult] = useState<string | null>(null)
  const [viralPointsResult, setViralPointsResult] = useState<string | null>(null)
  const [tagsResult, setTagsResult] = useState<string | null>(null)
  const [rhythmResult, setRhythmResult] = useState<string | null>(null)
  const [reportResult, setReportResult] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const [analyzeVideo] = useAnalyzeVideoMutation()
  const { data: analysisResultsData } = useGetAnalysisResultsQuery(videoId)

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

  const tabs = [
    { key: 'structure' as const, label: '文案结构', icon: '📐' },
    { key: 'viral_points' as const, label: '爆款分析', icon: '🔥' },
    { key: 'tags' as const, label: '选题标签', icon: '🏷️' },
    { key: 'rhythm' as const, label: '口播节奏', icon: '🎵' },
    { key: 'report' as const, label: '完整报告', icon: '📊' },
  ]

  const getAnalysisResult = (tab: AnalysisTab) => {
    switch (tab) {
      case 'structure': return structureResult
      case 'viral_points': return viralPointsResult
      case 'tags': return tagsResult
      case 'rhythm': return rhythmResult
      case 'report': return reportResult
    }
  }

  const getAnalysisCredit = (tab: AnalysisTab): number => {
    switch (tab) {
      case 'structure': return 5
      case 'viral_points': return 3
      case 'tags': return 2
      case 'rhythm': return 4
      case 'report': return 6
    }
  }

  const handleAnalyze = async (type: AnalysisTab) => {
    setIsAnalyzing(true)
    try {
      const result = await analyzeVideo({ id: videoId, analysisType: type }).unwrap()
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
        onRefetchUser()
        onToast('分析完成')
      } else {
        onToast(result.message || '分析失败')
      }
    } catch (err: any) {
      if (err.data?.code === 402) {
        onToast(err.data.message || '积分不足')
      } else {
        onToast(err.data?.message || '网络错误，请重试')
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const currentResult = getAnalysisResult(activeTab)

  return (
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
        {currentResult ? (
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">分析结果</span>
              <button
                className="btn-secondary px-3 py-1.5 text-xs"
                onClick={() => onCopy(currentResult)}
              >
                复制
              </button>
            </div>
            <div className="p-4 bg-sky-50 rounded-xl border border-sky-100">
              <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                {currentResult}
              </div>
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
              {isAnalyzing ? '分析中...' : `开始${tabs.find(t => t.key === activeTab)?.label}分析(${getAnalysisCredit(activeTab)}积分)`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default DeepAnalysisSection
