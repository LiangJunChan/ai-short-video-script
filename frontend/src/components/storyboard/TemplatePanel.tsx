interface TemplatePanelProps {
  templates: any[]
  onApply: (templateId: number) => void
  onSaveAs: () => void
  onClose: () => void
}

export default function TemplatePanel({ templates, onApply, onSaveAs, onClose }: TemplatePanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 w-[400px]">
        <h2 className="text-lg font-semibold mb-4">模板</h2>
        <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4">
          {templates.map((t) => (
            <div key={t.id} onClick={() => onApply(t.id)}
              className="p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <h3 className="text-sm font-medium text-slate-900">{t.name}</h3>
              {t.description && <p className="text-xs text-slate-400 mt-1">{t.description}</p>}
            </div>
          ))}
          {templates.length === 0 && <p className="text-sm text-slate-400 text-center py-4">暂无模板</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500">关闭</button>
          <button onClick={onSaveAs}
            className="px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600">
            保存当前为模板
          </button>
        </div>
      </div>
    </div>
  )
}
