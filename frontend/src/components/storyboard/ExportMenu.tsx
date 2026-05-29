interface ExportMenuProps {
  storyboardId: number
  onClose: () => void
}

export default function ExportMenu({ storyboardId, onClose }: ExportMenuProps) {
  const handleExport = async (format: string) => {
    const url = `/api/storyboards/${storyboardId}/export/${format}`
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error(err)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-[300px]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">导出</h2>
        <div className="space-y-2">
          <button onClick={() => handleExport('md')}
            className="w-full p-3 text-left border border-slate-200 rounded-lg hover:bg-slate-50">
            <span className="text-sm font-medium">Markdown</span>
            <span className="text-xs text-slate-400 block">分镜号+画面描述+文案+时长</span>
          </button>
          <button onClick={() => handleExport('text')}
            className="w-full p-3 text-left border border-slate-200 rounded-lg hover:bg-slate-50">
            <span className="text-sm font-medium">纯文案</span>
            <span className="text-xs text-slate-400 block">只导出文案内容</span>
          </button>
        </div>
      </div>
    </div>
  )
}
