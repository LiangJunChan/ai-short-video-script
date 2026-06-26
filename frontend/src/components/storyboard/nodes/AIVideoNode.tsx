import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import UnsavedBadge from './UnsavedBadge'

const AIVideoNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config || {}
  const result = data.result || {}

  const modeLabel = config.mode === 'image_to_video' ? '图生视频' : '文生视频'

  return (
    <div className={`relative shadow-av-md rounded-lg bg-av-bg-secondary border-2 min-w-[250px] max-w-[300px] ${
      selected ? 'border-orange-500' : 'border-av-border-subtle'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-orange-500" />
      {data.hasIncomingEdge === false && config.mode === 'image_to_video' && !config.image_url && (
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-av-state-warning rounded-full border-2 border-av-bg-primary" title="需要上游图片或手填图片 URL" />
      )}
      <UnsavedBadge show={data.isNew === true} />

      <div className="px-3 py-2 bg-orange-500/10 border-b border-av-border-subtle rounded-t-lg flex items-center justify-between">
        <span className="text-xs font-medium text-orange-400">🎬 AI 视频</span>
        {data.state === 'running' && <span className="text-xs text-av-state-warning animate-pulse">生成中...</span>}
        {data.state === 'done' && <span className="text-xs text-av-state-success">✓ 完成</span>}
        {data.state === 'error' && <span className="text-xs text-av-state-error">✗ 失败</span>}
      </div>

      <div className="px-3 py-2 space-y-1">
        <p className="text-xs text-av-text-tertiary">模式：{modeLabel}</p>
        {config.prompt && <p className="text-xs text-av-text-primary line-clamp-2">📝 {config.prompt}</p>}
        {config.image_url && <p className="text-xs text-av-text-tertiary line-clamp-1">🖼️ {config.image_url}</p>}
        {result.video_url && (
          <video src={result.video_url} className="w-full h-24 object-cover rounded mt-1" controls />
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-orange-500" />
    </div>
  )
})

AIVideoNode.displayName = 'AIVideoNode'
export default AIVideoNode
