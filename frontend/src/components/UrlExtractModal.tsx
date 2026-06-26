import { useState } from 'react'
import { useExtractByUrlMutation } from '../store/videoApi'

interface UrlExtractModalProps {
  onClose: () => void
}

function UrlExtractModal({ onClose }: UrlExtractModalProps) {
  const [videoUrl, setVideoUrl] = useState('')
  const [title, setTitle] = useState('')
  const [extracting, setExtracting] = useState(false)

  const [extractByUrl] = useExtractByUrlMutation()

  const handleExtract = async () => {
    if (!videoUrl.trim()) {
      alert('请输入视频分享链接')
      return
    }

    setExtracting(true)
    try {
      const result = await extractByUrl({
        url: videoUrl.trim(),
        title: title.trim() || '链接提取视频',
        uploader: '链接提取',
      }).unwrap()

      if (result.code === 200) {
        onClose()
        // Navigate to the detail page of the created video
        window.location.href = `/detail/${result.data.id}`
      } else {
        alert(result.message || '提取失败')
      }
    } catch (err: any) {
      alert(err.data?.message || '提取失败，请重试')
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-av-modal flex items-center justify-center bg-[rgba(8,9,13,0.7)] backdrop-blur-sm animate-fade-in">
      <div className="surface neon-border rounded-xl shadow-av-floating w-full max-w-md mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-av-border-subtle">
          <div>
            <h2 className="text-xl font-semibold text-av-text-primary">链接提取</h2>
            <p className="text-sm text-av-text-secondary mt-1">粘贴抖音/快手视频分享链接</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-av-text-tertiary hover:text-av-text-primary hover:bg-av-bg-hover rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-av-text-primary mb-2">视频分享链接</label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="input-field w-full px-4 py-3 text-sm"
              placeholder="https://v.douyin.com/..."
              autoFocus
            />
          </div>

          {/* Title (Optional) */}
          <div>
            <label className="block text-sm font-medium text-av-text-primary mb-2">
              视频标题 <span className="text-av-text-tertiary font-normal">(可选)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field w-full px-4 py-3 text-sm"
              placeholder="留空将自动获取"
            />
          </div>

          {/* Tips */}
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01" strokeLinecap="round"/>
              </svg>
              <div className="text-sm text-av-text-primary space-y-1">
                <p>• 在抖音/快手APP点击"分享"→"复制链接"</p>
                <p>• 粘贴到上方输入框即可自动提取文案</p>
                <p>• 提取费用: 5积分/次</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={extracting}
              className="flex-1 btn-secondary py-2.5 text-sm disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleExtract}
              disabled={extracting || !videoUrl.trim()}
              className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50"
            >
              {extracting ? '提取中...' : '开始提取'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UrlExtractModal
