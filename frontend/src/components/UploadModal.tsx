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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-900">上传视频</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="p-6">
          {step === 'select' ? (
            /* Drop Zone */
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center hover:border-sky-300 hover:bg-sky-50/50 transition-all cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sky-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-slate-700 font-medium mb-2">拖拽视频文件到此处</p>
              <p className="text-sm text-slate-500 mb-4">或点击选择文件</p>
              <p className="text-xs text-slate-400">支持 MP4、FLV、MOV 格式，最大 4GB</p>
              <input
                id="file-input"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          ) : (
            /* Form */
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="14,2 14,8 20,8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{selectedFile?.name}</p>
                  <p className="text-xs text-slate-500">{selectedFile ? formatFileSize(selectedFile.size) : ''}</p>
                </div>
                <button
                  onClick={() => setStep('select')}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">视频标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field w-full px-4 py-3 text-sm"
                  placeholder="输入视频标题"
                  autoFocus
                />
              </div>

              {/* Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">上传中...</span>
                    <span className="text-slate-500">{progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  disabled={uploading}
                  className="flex-1 btn-secondary py-2.5 text-sm disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !title.trim()}
                  className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50 shadow-sm"
                >
                  {uploading ? '上传中...' : '开始上传'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UploadModal
