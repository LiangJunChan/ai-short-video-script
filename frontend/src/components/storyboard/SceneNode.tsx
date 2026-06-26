import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { SceneConfig } from '../../types'

const SceneNode = memo(({ data, selected }: NodeProps) => {
  const config: SceneConfig = data.config || {}
  const nodeType = data.nodeType || 'scene'

  if (nodeType === 'start') {
    return (
      <div className="px-4 py-2 shadow-av-md rounded-full bg-av-state-success/10 border-2 border-av-state-success/50 min-w-[80px] text-center">
        <div className="text-sm font-medium text-av-state-success">{config.label || '开始'}</div>
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-av-state-success" />
      </div>
    )
  }

  if (nodeType === 'end') {
    return (
      <div className="px-4 py-2 shadow-av-md rounded-full bg-av-state-error/10 border-2 border-av-state-error/50 min-w-[80px] text-center">
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-av-state-error" />
        <div className="text-sm font-medium text-av-state-error">{config.label || '结束'}</div>
      </div>
    )
  }

  const shotLabels: Record<string, string> = {
    close: '近景', medium: '中景', long: '远景', extreme_close: '特写',
  }
  const camLabels: Record<string, string> = {
    static: '固定', push: '推', pull: '拉', pan: '摇', track: '跟',
  }

  return (
    <div className={`shadow-av-md rounded-lg bg-av-bg-secondary border-2 min-w-[250px] max-w-[300px] ${
      selected ? 'border-primary' : 'border-av-border-subtle'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-primary" />

      <div className="px-3 py-2 bg-av-bg-tertiary border-b border-av-border-subtle rounded-t-lg flex items-center justify-between">
        <span className="text-xs font-medium text-primary">🎬 分镜</span>
        {config.duration && (
          <span className="text-xs text-av-text-tertiary">{config.duration}</span>
        )}
      </div>

      <div className="px-3 py-2 space-y-1">
        {config.script && (
          <p className="text-xs text-av-text-primary line-clamp-3">{config.script}</p>
        )}
        {config.description && (
          <p className="text-xs text-av-text-tertiary line-clamp-2">📷 {config.description}</p>
        )}
        <div className="flex gap-1 flex-wrap">
          {config.shot_type && (
            <span className="text-xs px-1.5 py-0.5 bg-accent/10 text-accent rounded">
              {shotLabels[config.shot_type] || config.shot_type}
            </span>
          )}
          {config.camera_move && (
            <span className="text-xs px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded">
              {camLabels[config.camera_move] || config.camera_move}
            </span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-primary" />
    </div>
  )
})

SceneNode.displayName = 'SceneNode'

export default SceneNode
