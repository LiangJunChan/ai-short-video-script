import { useState, useEffect } from 'react'

interface NodeConfigPanelProps {
  nodeId: string
  nodeType: string
  config: Record<string, any>
  onSave: (config: Record<string, any>) => void
  onClose: () => void
}

export default function NodeConfigPanel({ nodeId, nodeType, config, onSave, onClose }: NodeConfigPanelProps) {
  const [formData, setFormData] = useState<Record<string, any>>(config || {})

  useEffect(() => {
    setFormData(config || {})
  }, [config, nodeId])

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    onSave(formData)
  }

  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">配置节点</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {/* scene 节点 */}
        {nodeType === 'scene' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">文案</label>
              <textarea value={formData.script || ''} onChange={(e) => handleChange('script', e.target.value)}
                rows={4} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">画面描述</label>
              <textarea value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)}
                rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">时长</label>
                <input type="text" value={formData.duration || ''} onChange={(e) => handleChange('duration', e.target.value)}
                  placeholder="0-5s" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">景别</label>
                <select value={formData.shot_type || ''} onChange={(e) => handleChange('shot_type', e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                  <option value="">选择</option>
                  <option value="extreme_close">特写</option>
                  <option value="close">近景</option>
                  <option value="medium">中景</option>
                  <option value="long">远景</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">运镜</label>
              <select value={formData.camera_move || ''} onChange={(e) => handleChange('camera_move', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option value="">选择</option>
                <option value="static">固定</option>
                <option value="push">推</option>
                <option value="pull">拉</option>
                <option value="pan">摇</option>
                <option value="track">跟</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">备注</label>
              <textarea value={formData.notes || ''} onChange={(e) => handleChange('notes', e.target.value)}
                rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
          </div>
        )}

        {/* ai_text 节点 */}
        {nodeType === 'ai_text' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">提示词（必填）</label>
              <textarea value={formData.prompt || ''} onChange={(e) => handleChange('prompt', e.target.value)}
                rows={3} placeholder="写一个关于咖啡拉花的短视频口播文案" required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">风格</label>
              <select value={formData.style || '亲切'} onChange={(e) => handleChange('style', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="亲切">亲切自然</option>
                <option value="专业">专业严谨</option>
                <option value="幽默">幽默风趣</option>
                <option value="激情">激情澎湃</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">字数</label>
              <input type="number" value={formData.word_count || 200} onChange={(e) => handleChange('word_count', parseInt(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
        )}

        {/* ai_image 节点 */}
        {nodeType === 'ai_image' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">图片描述（必填）</label>
              <textarea value={formData.prompt || ''} onChange={(e) => handleChange('prompt', e.target.value)}
                rows={3} placeholder="一个女孩在咖啡厅微笑，暖色调"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
            <p className="text-xs text-amber-600">⚠️ AI 图片生成暂未实现</p>
          </div>
        )}

        {/* ai_split 节点 */}
        {nodeType === 'ai_split' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">文案（必填）</label>
              <textarea value={formData.input_text || ''} onChange={(e) => handleChange('input_text', e.target.value)}
                rows={4} placeholder="粘贴需要拆分的短视频文案..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">目标分镜数</label>
              <input type="number" value={formData.split_count || 6} onChange={(e) => handleChange('split_count', parseInt(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        )}

        {/* tts 节点 */}
        {nodeType === 'tts' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">文案（必填）</label>
              <textarea value={formData.input_text || ''} onChange={(e) => handleChange('input_text', e.target.value)}
                rows={3} placeholder="需要转为语音的文案..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">音色</label>
              <select value={formData.voice || 'female_warm'} onChange={(e) => handleChange('voice', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="female_warm">温柔女声</option>
                <option value="male_deep">沉稳男声</option>
                <option value="female_cheerful">活泼女声</option>
              </select>
            </div>
            <p className="text-xs text-amber-600">⚠️ TTS 配音暂未实现</p>
          </div>
        )}

        {/* start/end 节点 */}
        {(nodeType === 'start' || nodeType === 'end') && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">标签</label>
              <input type="text" value={formData.label || (nodeType === 'start' ? '开始' : '结束')}
                onChange={(e) => handleChange('label', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
          </div>
        )}

        <button onClick={handleSave}
          className="w-full mt-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors">
          保存
        </button>
      </div>
    </div>
  )
}
