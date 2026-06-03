interface CanvasToolbarProps {
  name: string
  onNameChange: (name: string) => void
  onSave: () => void
  onAISplit: () => void
  onTemplate: () => void
  onExport: () => void
  onExecute: () => void
  onBack: () => void
  isSaving: boolean
}

export default function CanvasToolbar({
  name, onNameChange, onSave, onAISplit, onTemplate, onExport, onExecute, onBack, isSaving,
}: CanvasToolbarProps) {
  return (
    <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          ← 返回
        </button>
        <span className="text-slate-300">|</span>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="text-sm font-medium text-slate-900 bg-transparent border-none outline-none max-w-[200px]"
          placeholder="画布名称"
        />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onExecute} className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100">
          ▶ 执行
        </button>
        <button onClick={onAISplit} className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100">
          AI 分镜
        </button>
        <button onClick={onTemplate} className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100">
          模板
        </button>
        <button onClick={onExport} className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100">
          导出
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-3 py-1.5 text-xs font-medium text-white bg-sky-500 rounded-lg hover:bg-sky-600 disabled:opacity-50"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
