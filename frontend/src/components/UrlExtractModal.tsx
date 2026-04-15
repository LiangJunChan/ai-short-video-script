import { useState } from 'react'
import { useExtractByUrlMutation } from '../store/videoApi'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface UrlExtractModalProps {
  onClose: () => void
}

function UrlExtractModal({ onClose }: UrlExtractModalProps) {
  const { user } = useAuth()
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [processing, setProcessing] = useState(false)
  const navigate = useNavigate()

  const [extractByUrl] = useExtractByUrlMutation()

  const handleExtract = async () => {
    if (!url.trim()) {
      alert('请输入抖音分享链接')
      return
    }

    setProcessing(true)

    try {
      const result = await extractByUrl({
        url: url.trim(),
        title: title.trim(),
        uploader: user?.username || '匿名用户',
      }).unwrap()

      if (result.code === 200) {
        onClose()
        navigate(`/detail/${result.data.id}`)
      } else {
        alert(result.message || '提取失败')
      }
    } catch (err: any) {
      if (err.data?.message) {
        alert(err.data.message)
      } else {
        alert('提取失败，请重试')
      }
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] flex items-center justify-center animate-overlay-in"
      onClick={onClose}
    >
      <div
        className="bg-white/90 backdrop-blur-glass rounded-xl p-8 w-[520px] max-w-[calc(100vw-48px)] animate-modal-in shadow-glass border border-border-glass"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-heading font-semibold text-primary mb-6 tracking-tight">
          链接提取文案
        </h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">抖音分享链接</label>
            <textarea
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="粘贴抖音分享链接，例如：https://v.douyin.com/ABC123/"
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm outline-none focus:border-accent transition-all duration-200 min-h-[80px] resize-none bg-white/50"
            />
            <p className="text-xs text-neutral-500 mt-2">支持直接复制抖音分享文本，会自动提取链接</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">视频标题（可选）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="留空将自动生成"
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm outline-none focus:border-accent transition-all duration-200 bg-white/50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 px-4 py-3 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-600 hover:border-neutral-400 transition-all duration-200 disabled:opacity-40 cursor-pointer"
              onClick={onClose}
              disabled={processing}
            >
              取消
            </button>
            <button
              className="flex-1 px-4 py-3 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all duration-200 disabled:opacity-40 cursor-pointer"
              onClick={handleExtract}
              disabled={processing}
            >
              {processing ? '处理中...' : '开始提取'}
            </button>
          </div>

          <div className="text-xs text-neutral-500 bg-neutral-50 rounded-lg p-3 border border-neutral-200">
            <p>💡 提示：提取成功需要消耗 5 积分，提取完成后会自动跳转到详情页</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UrlExtractModal