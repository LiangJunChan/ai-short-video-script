import { useState } from 'react'
import { useRewriteVideoTextMutation } from '../store/videoApi'
import { Video } from '../types'

interface TextRewriteSectionProps {
  video: Video
  videoId: number
  onToast: (msg: string) => void
  onCopy: (text: string) => Promise<void>
  onRefetchUser: () => void
}

function TextRewriteSection({ video, videoId, onToast, onCopy, onRefetchUser }: TextRewriteSectionProps) {
  const [rewritePrompt, setRewritePrompt] = useState('')
  const [rewriteResult, setRewriteResult] = useState<string | null>(null)
  const [rewriteVideoText, { isLoading: isRewriting }] = useRewriteVideoTextMutation()

  const handleRewrite = async () => {
    if (!rewritePrompt.trim()) {
      onToast('请输入改写要求')
      return
    }

    try {
      const result = await rewriteVideoText({ id: videoId, prompt: rewritePrompt }).unwrap()
      if (result.code === 200) {
        setRewriteResult(result.data?.text || '')
        onRefetchUser()
        onToast('改写完成')
      } else {
        onToast(result.message || '改写失败')
      }
    } catch (err: any) {
      if (err.data?.code === 402) {
        onToast(err.data.message || '积分不足，改写需要10积分')
      } else {
        onToast(err.data?.message || '网络错误，请重试')
      }
    }
  }

  const currentResult = rewriteResult || video.rewrittenText

  return (
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
          {isRewriting ? '改写中...' : '改写(10积分)'}
        </button>
      </div>

      {currentResult && (
        <div className="pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">改写结果</span>
            <button
              className="btn-secondary px-3 py-1.5 text-xs"
              onClick={() => onCopy(currentResult)}
            >
              复制
            </button>
          </div>
          <div className="p-4 bg-sky-50 rounded-xl border border-sky-100">
            <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {currentResult}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TextRewriteSection
