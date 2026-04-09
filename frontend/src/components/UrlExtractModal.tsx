import { useState } from 'react'
import { useExtractByUrlMutation } from '../store/videoApi'
import { useNavigate } from 'react-router-dom'

interface UrlExtractModalProps {
  onClose: () => void
}

function UrlExtractModal({ onClose }: UrlExtractModalProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [uploader, setUploader] = useState('')
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
        uploader: uploader.trim(),
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
        className="bg-white rounded-xl p-10 w-[520px] max-w-[calc(100vw-48px)] animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-normal mb-7" style={{ fontFamily: 'var(--font-serif)' }}>
          链接提取文案
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#333] mb-1.5">抖音分享链接</label>
            <textarea
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="粘贴抖音分享链接，例如：https://v.douyin.com/ABC123/"
              className="w-full px-4 py-3 border border-[#e5e5e5] rounded-lg text-sm outline-none focus:border-black transition-colors min-h-[80px] resize-none"
            />
            <p className="text-xs text-[#999] mt-1">支持直接复制抖音分享文本，会自动提取链接</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#333] mb-1.5">视频标题（可选）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="留空将自动生成"
              className="w-full px-4 py-2.5 border border-[#e5e5e5] rounded-lg text-sm outline-none focus:border-black transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#333] mb-1.5">上传者（可选）</label>
            <input
              type="text"
              value={uploader}
              onChange={(e) => setUploader(e.target.value)}
              placeholder="默认为匿名用户"
              className="w-full px-4 py-2.5 border border-[#e5e5e5] rounded-lg text-sm outline-none focus:border-black transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 px-4 py-2.5 border border-[#e5e5e5] rounded-lg text-sm font-medium text-[#666] hover:border-[#999] transition-colors disabled:opacity-40"
              onClick={onClose}
              disabled={processing}
            >
              取消
            </button>
            <button
              className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
              onClick={handleExtract}
              disabled={processing}
            >
              {processing ? '处理中...' : '开始提取'}
            </button>
          </div>

          <div className="text-xs text-[#999]">
            <p>💡 提示：提取成功需要消耗 5 积分，提取完成后会自动跳转到详情页</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UrlExtractModal