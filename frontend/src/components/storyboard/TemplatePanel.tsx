interface TemplatePanelProps {
  templates: any[]
  onApply: (templateId: number) => void
  onSaveAs: () => void
  onClose: () => void
}

export default function TemplatePanel({ templates, onApply, onSaveAs, onClose }: TemplatePanelProps) {
  return (
    <div className="fixed inset-0 z-av-modal flex items-center justify-center bg-[rgba(8,9,13,0.7)] backdrop-blur-sm">
      <div className="surface neon-border rounded-xl p-6 w-[400px]">
        <h2 className="text-lg font-semibold mb-4 text-av-text-primary">模板</h2>
        <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4">
          {templates.map((t) => (
            <div key={t.id} onClick={() => onApply(t.id)}
              className="p-3 border border-av-border-subtle rounded-lg cursor-pointer hover:bg-av-bg-hover transition-colors">
              <h3 className="text-sm font-medium text-av-text-primary">{t.name}</h3>
              {t.description && <p className="text-xs text-av-text-tertiary mt-1">{t.description}</p>}
            </div>
          ))}
          {templates.length === 0 && <p className="text-sm text-av-text-tertiary text-center py-4">暂无模板</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">关闭</button>
          <button onClick={onSaveAs}
            className="px-4 py-2 bg-av-state-warning text-av-text-inverse text-sm rounded-lg hover:bg-av-state-warning/90 transition-colors">
            保存当前为模板
          </button>
        </div>
      </div>
    </div>
  )
}
