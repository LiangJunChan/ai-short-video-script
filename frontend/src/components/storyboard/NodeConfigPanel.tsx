import { useState, useEffect } from 'react'
import ResultViewer from './ResultViewer'

interface NodeConfigPanelProps {
  nodeId: string
  nodeType: string
  config: Record<string, any>
  result?: any
  onSave: (config: Record<string, any>) => Promise<void> | void
  onClose: () => void
}

export default function NodeConfigPanel({ nodeId, nodeType, config, result, onSave, onClose }: NodeConfigPanelProps) {
  const [formData, setFormData] = useState<Record<string, any>>(config || {})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFormData(config || {})
  }, [config, nodeId])

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      await onSave(formData)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-80 bg-av-bg-secondary border-l border-av-border-subtle h-full overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-av-text-primary">配置节点</h3>
          <button onClick={onClose} className="text-av-text-tertiary hover:text-av-text-secondary">✕</button>
        </div>

        {/* scene 节点 */}
        {nodeType === 'scene' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">文案</label>
              <textarea value={formData.script || ''} onChange={(e) => handleChange('script', e.target.value)}
                rows={4} className="input-field w-full px-3 py-2 text-sm resize-none" />
            </div>
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">画面描述</label>
              <textarea value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)}
                rows={2} className="input-field w-full px-3 py-2 text-sm resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-av-text-secondary mb-1">时长</label>
                <input type="text" value={formData.duration || ''} onChange={(e) => handleChange('duration', e.target.value)}
                  placeholder="0-5s" className="input-field w-full px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-av-text-secondary mb-1">景别</label>
                <select value={formData.shot_type || ''} onChange={(e) => handleChange('shot_type', e.target.value)}
                  className="input-field w-full px-3 py-1.5 text-sm">
                  <option value="">选择</option>
                  <option value="extreme_close">特写</option>
                  <option value="close">近景</option>
                  <option value="medium">中景</option>
                  <option value="long">远景</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">运镜</label>
              <select value={formData.camera_move || ''} onChange={(e) => handleChange('camera_move', e.target.value)}
                className="input-field w-full px-3 py-1.5 text-sm">
                <option value="">选择</option>
                <option value="static">固定</option>
                <option value="push">推</option>
                <option value="pull">拉</option>
                <option value="pan">摇</option>
                <option value="track">跟</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">备注</label>
              <textarea value={formData.notes || ''} onChange={(e) => handleChange('notes', e.target.value)}
                rows={2} className="input-field w-full px-3 py-2 text-sm resize-none" />
            </div>
          </div>
        )}

        {/* ai_text 节点 */}
        {nodeType === 'ai_text' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">提示词（必填）</label>
              <textarea value={formData.prompt || ''} onChange={(e) => handleChange('prompt', e.target.value)}
                rows={3} placeholder="写一个关于咖啡拉花的短视频口播文案" required
                className="input-field w-full px-3 py-2 text-sm resize-none" />
            </div>
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">风格</label>
              <select value={formData.style || '亲切'} onChange={(e) => handleChange('style', e.target.value)}
                className="input-field w-full px-3 py-1.5 text-sm">
                <option value="亲切">亲切自然</option>
                <option value="专业">专业严谨</option>
                <option value="幽默">幽默风趣</option>
                <option value="激情">激情澎湃</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">字数</label>
              <input type="number" value={formData.word_count || 200} onChange={(e) => handleChange('word_count', parseInt(e.target.value))}
                className="input-field w-full px-3 py-1.5 text-sm" />
            </div>
          </div>
        )}

        {/* ai_image 节点 */}
        {nodeType === 'ai_image' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">生成模式</label>
              <select value={formData.mode || 'text_to_image'} onChange={(e) => handleChange('mode', e.target.value)}
                className="input-field w-full px-3 py-1.5 text-sm">
                <option value="text_to_image">文生图</option>
                <option value="image_to_image">图生图</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">图片描述（必填）</label>
              <textarea value={formData.prompt || ''} onChange={(e) => handleChange('prompt', e.target.value)}
                rows={3} placeholder="一个女孩在咖啡厅微笑，暖色调，电影感"
                className="input-field w-full px-3 py-2 text-sm resize-none" />
            </div>
            {formData.mode === 'image_to_image' && (
              <div>
                <label className="block text-xs text-av-text-secondary mb-1">参考图片 URL</label>
                <input type="text" value={formData.image_url || ''} onChange={(e) => handleChange('image_url', e.target.value)}
                  placeholder="可留空，优先使用上游 AI 图片节点结果"
                  className="input-field w-full px-3 py-1.5 text-sm" />
                <p className="text-xs text-av-text-tertiary mt-1">连接 ai_image → ai_image 时会自动使用上游生成图片。</p>
              </div>
            )}
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">尺寸</label>
              <select value={formData.size || '1024x768'} onChange={(e) => handleChange('size', e.target.value)}
                className="input-field w-full px-3 py-1.5 text-sm">
                <option value="1024x768">1024x768（横屏）</option>
                <option value="768x1024">768x1024（竖屏）</option>
                <option value="1024x1024">1024x1024（方图）</option>
              </select>
            </div>
            <p className="text-xs text-av-state-success">✓ 使用 Agnes Image 2.1 Flash，支持文生图与图生图，第一版暂不扣积分</p>
          </div>
        )}

        {/* ai_video 节点 */}
        {nodeType === 'ai_video' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">生成模式</label>
              <select value={formData.mode || 'text_to_video'} onChange={(e) => handleChange('mode', e.target.value)}
                className="input-field w-full px-3 py-1.5 text-sm">
                <option value="text_to_video">文生视频</option>
                <option value="image_to_video">图生视频</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">视频描述（必填）</label>
              <textarea value={formData.prompt || ''} onChange={(e) => handleChange('prompt', e.target.value)}
                rows={3} placeholder="主体 + 动作 + 场景 + 镜头运动 + 光照 + 风格"
                className="input-field w-full px-3 py-2 text-sm resize-none" />
            </div>
            {formData.mode === 'image_to_video' && (
              <div>
                <label className="block text-xs text-av-text-secondary mb-1">参考图片 URL</label>
                <input type="text" value={formData.image_url || ''} onChange={(e) => handleChange('image_url', e.target.value)}
                  placeholder="可留空，优先使用上游 AI 图片节点结果"
                  className="input-field w-full px-3 py-1.5 text-sm" />
                <p className="text-xs text-av-text-tertiary mt-1">连接 ai_image → ai_video 时会自动使用上游生成图片。</p>
              </div>
            )}
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">分辨率预设</label>
              <select value={`${formData.width || 576}x${formData.height || 1024}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split('x').map(Number)
                  setFormData((f) => ({ ...f, width: w, height: h }))
                }}
                className="input-field w-full px-3 py-1.5 text-sm">
                <option value="576x1024">576×1024（480p 竖屏）</option>
                <option value="720x1280">720×1280（720p 竖屏）</option>
                <option value="1152x768">1152×768（横屏）</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-av-text-secondary mb-1">宽度</label>
                <input type="number" value={formData.width || 576} onChange={(e) => handleChange('width', parseInt(e.target.value))}
                  min={1}
                  className="input-field w-full px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-av-text-secondary mb-1">高度</label>
                <input type="number" value={formData.height || 1024} onChange={(e) => handleChange('height', parseInt(e.target.value))}
                  min={1}
                  className="input-field w-full px-3 py-1.5 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-av-text-secondary mb-1">帧数</label>
                <select value={formData.num_frames || 121} onChange={(e) => handleChange('num_frames', parseInt(e.target.value))}
                  className="input-field w-full px-3 py-1.5 text-sm">
                  <option value={81}>81（约3秒）</option>
                  <option value={121}>121（约5秒）</option>
                  <option value={241}>241（约10秒）</option>
                  <option value={441}>441（约18秒）</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-av-text-secondary mb-1">FPS</label>
                <input type="number" value={formData.frame_rate || 24} onChange={(e) => handleChange('frame_rate', parseInt(e.target.value))}
                  min={1} max={60}
                  className="input-field w-full px-3 py-1.5 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">负向提示词</label>
              <textarea value={formData.negative_prompt || ''} onChange={(e) => handleChange('negative_prompt', e.target.value)}
                rows={2} placeholder="避免变形、模糊、低质量..."
                className="input-field w-full px-3 py-2 text-sm resize-none" />
            </div>
            <p className="text-xs text-av-state-success">✓ 使用 Agnes Video V2.0，同步轮询到完成，第一版暂不扣积分</p>
          </div>
        )}

        {/* ai_split 节点 */}
        {nodeType === 'ai_split' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">文案（必填）</label>
              <textarea value={formData.input_text || ''} onChange={(e) => handleChange('input_text', e.target.value)}
                rows={4} placeholder="粘贴需要拆分的短视频文案..."
                className="input-field w-full px-3 py-2 text-sm resize-none" />
            </div>
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">目标分镜数</label>
              <input type="number" value={formData.split_count || 6} onChange={(e) => handleChange('split_count', parseInt(e.target.value))}
                className="input-field w-full px-3 py-1.5 text-sm" />
            </div>
          </div>
        )}

        {/* tts 节点 */}
        {nodeType === 'tts' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">文案（必填）</label>
              <textarea value={formData.input_text || ''} onChange={(e) => handleChange('input_text', e.target.value)}
                rows={3} placeholder="需要转为语音的文案..."
                className="input-field w-full px-3 py-2 text-sm resize-none" />
            </div>
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">音色</label>
              <select value={formData.voice || 'female_warm'} onChange={(e) => handleChange('voice', e.target.value)}
                className="input-field w-full px-3 py-1.5 text-sm">
                <option value="female_warm">温柔女声</option>
                <option value="male_deep">沉稳男声</option>
                <option value="female_cheerful">活泼女声</option>
              </select>
            </div>
            <p className="text-xs text-av-state-warning">⚠️ TTS 配音暂未实现</p>
          </div>
        )}

        {/* start/end 节点 */}
        {(nodeType === 'start' || nodeType === 'end') && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">标签</label>
              <input type="text" value={formData.label || (nodeType === 'start' ? '开始' : '结束')}
                onChange={(e) => handleChange('label', e.target.value)}
                className="input-field w-full px-3 py-1.5 text-sm" />
            </div>
          </div>
        )}

        {result && (
          <div className="mt-4 pt-4 border-t border-av-border-subtle">
            <h4 className="text-xs font-semibold text-av-text-secondary mb-2">执行结果</h4>
            <ResultViewer nodeType={nodeType} result={result} />
          </div>
        )}

        {/* 节点级强制重新执行：仅对可执行 AI 节点显示 */}
        {['ai_text', 'ai_image', 'ai_split', 'ai_video', 'tts'].includes(nodeType) && (
          <div className="mt-4 pt-4 border-t border-av-border-subtle">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.force_execute === true}
                onChange={(e) => handleChange('force_execute', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-av-border-strong text-primary focus:ring-primary/30"
              />
              <span className="text-xs text-av-text-secondary">
                强制重新执行此节点
                <span className="block text-av-text-tertiary mt-0.5">勾选后，下次执行时即使该节点已完成也会重新生成</span>
              </span>
            </label>
          </div>
        )}

        <button onClick={handleSave} disabled={saving}
          className="btn-primary w-full mt-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
