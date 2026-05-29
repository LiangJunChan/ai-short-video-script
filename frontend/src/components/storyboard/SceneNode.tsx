import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { SceneConfig } from '../../types'

const SceneNode = memo(({ data, selected }: NodeProps) => {
  const config: SceneConfig = data.config || {}
  const nodeType = data.nodeType || 'scene'

  if (nodeType === 'start') {
    return (
      <div className="px-4 py-2 shadow-md rounded-full bg-green-100 border-2 border-green-400 min-w-[80px] text-center">
        <div className="text-sm font-medium text-green-800">{config.label || '开始'}</div>
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-green-500" />
      </div>
    )
  }

  if (nodeType === 'end') {
    return (
      <div className="px-4 py-2 shadow-md rounded-full bg-red-100 border-2 border-red-400 min-w-[80px] text-center">
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-red-500" />
        <div className="text-sm font-medium text-red-800">{config.label || '结束'}</div>
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
    <div className={`shadow-md rounded-lg bg-white border-2 min-w-[250px] max-w-[300px] ${
      selected ? 'border-sky-500' : 'border-slate-200'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-sky-500" />

      <div className="px-3 py-2 bg-sky-50 border-b border-slate-100 rounded-t-lg flex items-center justify-between">
        <span className="text-xs font-medium text-sky-700">🎬 分镜</span>
        {config.duration && (
          <span className="text-xs text-slate-500">{config.duration}</span>
        )}
      </div>

      <div className="px-3 py-2 space-y-1">
        {config.script && (
          <p className="text-xs text-slate-800 line-clamp-3">{config.script}</p>
        )}
        {config.description && (
          <p className="text-xs text-slate-500 line-clamp-2">📷 {config.description}</p>
        )}
        <div className="flex gap-1 flex-wrap">
          {config.shot_type && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
              {shotLabels[config.shot_type] || config.shot_type}
            </span>
          )}
          {config.camera_move && (
            <span className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">
              {camLabels[config.camera_move] || config.camera_move}
            </span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-sky-500" />
    </div>
  )
})

SceneNode.displayName = 'SceneNode'

export default SceneNode
