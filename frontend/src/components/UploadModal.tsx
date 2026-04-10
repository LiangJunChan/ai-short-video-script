import { useState } from 'react'
import { useUploadVideoMutation } from '../store/videoApi'
import { useAuth } from '../hooks/useAuth'

interface UploadModalProps {
  onClose: () => void
  onUploadSuccess: () => void
}

function UploadModal({ onClose, onUploadSuccess }: UploadModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<'select' | 'form'>('select')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  const [uploadVideo] = useUploadVideoMutation()

  const handleFileSelect = (file: File) => {
    if (!file) return

    const allowedExtensions = ['.mp4', '.flv', '.mov']
    const ext = '.' + file.name.split('.').pop()!.toLowerCase()

    if (!allowedExtensions.includes(ext)) {
      alert('不支持的文件格式，仅支持MP4、FLV、MOV')
      return
    }

    if (file.size > 4 * 1024 * 1024 * 1024) {
      alert('文件大小不能超过4GB')
      return
    }

    setSelectedFile(file)
    const defaultTitle = file.name.replace(/\.[^/.]+$/, '')
    setTitle(defaultTitle)
    setStep('form')
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('请先选择视频文件')
      return
    }

    if (!title.trim()) {
      alert('请输入视频标题')
      return
    }

    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('video', selectedFile)
    formData.append('title', title.trim())
    formData.append('uploader', user?.username || '匿名用户')

    try {
      // Simulate progress since RTK doesn't support upload progress natively
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 500)

      const result = await uploadVideo(formData).unwrap()

      clearInterval(progressInterval)
      setProgress(100)

      if (result.code === 200) {
        onUploadSuccess()
        window.location.reload()
      } else {
        alert(result.message || '上传失败')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] flex items-center justify-center animate-overlay-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-10 w-[480px] max-w-[calc(100vw-48px)] animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-normal mb-7" style={{ fontFamily: 'var(--font-serif)' }}>
          上传视频
        </h2>

        {step === 'select' && (
          <div
            className="border-2 border-dashed border-[#e5e5e5] rounded-xl p-12 text-center cursor-pointer hover:border-[#999] transition-colors"
            onClick={() => document.getElementById('fileInput')?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <svg
              className="w-12 h-12 mx-auto mb-4 text-[#999]"
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M8 32h32M24 8v20M16 16l8-8 8 8" />
              <rect x="4" y="28" width="40" height="16" rx="4" />
            </svg>
            <p className="text-sm text-[#666] mb-4">点击或拖拽视频文件到此处上传</p>
            <p className="text-xs text-[#999] font-light">
              支持格式：MP4、FLV、MOV<br />
              文件大小：不超过 4GB<br />
              时长：15秒 - 10分钟
            </p>
            <input
              id="fileInput"
              type="file"
              accept=".mp4,.flv,.mov"
              hidden
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelect(e.target.files[0])
                }
              }}
            />
          </div>
        )}

        {step === 'form' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#333] mb-1.5">视频标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入视频标题"
                className="w-full px-4 py-2.5 border border-[#e5e5e5] rounded-lg text-sm outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Progress bar */}
            <div className="relative h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-black rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-[#999] text-center block">{progress}%</span>

            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 px-4 py-2.5 border border-[#e5e5e5] rounded-lg text-sm font-medium text-[#666] hover:border-[#999] transition-colors disabled:opacity-40"
                onClick={onClose}
                disabled={uploading}
              >
                取消
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? '上传中...' : '确认上传'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadModal
