import { useState, useEffect } from 'react'
import { SceneConfig } from '../../types'

interface NodeEditorPanelProps {
  nodeId: string
  config: SceneConfig
  onSave: (config: SceneConfig) => void
  onClose: () => void
}

export default function NodeEditorPanel({ nodeId, config, onSave, onClose }: NodeEditorPanelProps) {
  const [script, setScript] = useState(config.script || '')
  const [description, setDescription] = useState(config.description || '')
  const [duration, setDuration] = useState(config.duration || '')
  const [shotType, setShotType] = useState(config.shot_type || '')
  const [cameraMove, setCameraMove] = useState(config.camera_move || '')
  const [notes, setNotes] = useState(config.notes || '')

  useEffect(() => {
    setScript(config.script || '')
    setDescription(config.description || '')
    setDuration(config.duration || '')
    setShotType(config.shot_type || '')
    setCameraMove(config.camera_move || '')
    setNotes(config.notes || '')
  }, [config, nodeId])

  const handleSave = () => {
    onSave({ script, description, duration, shot_type: shotType, camera_move: cameraMove, notes })
  }

  return (
    <div className="w-80 bg-av-bg-secondary border-l border-av-border-subtle h-full overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-av-text-primary">编辑分镜</h3>
          <button onClick={onClose} className="text-av-text-tertiary hover:text-av-text-secondary">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-av-text-secondary mb-1">文案</label>
            <textarea value={script} onChange={(e) => setScript(e.target.value)} rows={4}
              className="input-field w-full px-3 py-2 text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs text-av-text-secondary mb-1">画面描述</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="input-field w-full px-3 py-2 text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">时长</label>
              <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="0-5s"
                className="input-field w-full px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-av-text-secondary mb-1">景别</label>
              <select value={shotType} onChange={(e) => setShotType(e.target.value)}
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
            <select value={cameraMove} onChange={(e) => setCameraMove(e.target.value)}
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
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="input-field w-full px-3 py-2 text-sm resize-none" />
          </div>
          <button onClick={handleSave}
            className="btn-primary w-full py-2 text-sm font-medium rounded-lg transition-colors">
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
