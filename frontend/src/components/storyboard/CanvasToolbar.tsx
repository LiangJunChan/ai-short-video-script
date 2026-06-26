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
    <div className="h-12 bg-av-bg-secondary border-b border-av-border-subtle flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-av-text-secondary hover:text-av-text-primary transition-colors"
        >
          ← 返回
        </button>
        <span className="text-av-text-tertiary">|</span>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="text-sm font-medium text-av-text-primary bg-transparent border-none outline-none max-w-[200px]"
          placeholder="画布名称"
        />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onExecute} className="px-3 py-1.5 text-xs font-medium text-av-state-success bg-av-state-success/10 rounded-lg hover:bg-av-state-success/20">
          ▶ 执行
        </button>
        <button onClick={onAISplit} className="px-3 py-1.5 text-xs font-medium text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20">
          AI 分镜
        </button>
        <button onClick={onTemplate} className="px-3 py-1.5 text-xs font-medium text-av-state-warning bg-av-state-warning/10 rounded-lg hover:bg-av-state-warning/20">
          模板
        </button>
        <button onClick={onExport} className="px-3 py-1.5 text-xs font-medium text-av-text-secondary bg-av-bg-tertiary rounded-lg hover:bg-av-bg-hover">
          导出
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="btn-primary px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
