import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import UnsavedBadge from './UnsavedBadge'
import { useMediaViewer } from '../MediaViewerContext'

const AIImageNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config || {}
  const result = data.result || {}
  const { openMedia } = useMediaViewer()

  const modeLabel = config.mode === 'image_to_image' ? '图生图' : '文生图'

  return (
    <div className={`relative shadow-av-md rounded-lg bg-av-bg-secondary border-2 min-w-[250px] max-w-[300px] ${
      selected ? 'border-pink-500' : 'border-av-border-subtle'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-pink-500" />
      {data.hasIncomingEdge === false && config.mode === 'image_to_image' && !config.image_url && (
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-av-state-warning rounded-full border-2 border-av-bg-primary" title="需要上游图片或手填图片 URL" />
      )}
      <UnsavedBadge show={data.isNew === true} />

      <div className="px-3 py-2 bg-pink-500/10 border-b border-av-border-subtle rounded-t-lg flex items-center justify-between">
        <span className="text-xs font-medium text-pink-400">🖼️ AI 图片</span>
        {data.state === 'running' && <span className="text-xs text-av-state-warning animate-pulse">生成中...</span>}
        {data.state === 'done' && <span className="text-xs text-av-state-success">✓ 完成</span>}
        {data.state === 'error' && <span className="text-xs text-av-state-error">✗ 失败</span>}
      </div>

      <div className="px-3 py-2 space-y-1">
        <p className="text-xs text-av-text-tertiary">模式：{modeLabel}</p>
        {config.prompt && <p className="text-xs text-av-text-primary line-clamp-2">📝 {config.prompt}</p>}
        {config.image_url && <p className="text-xs text-av-text-tertiary line-clamp-1">🖼️ {config.image_url}</p>}
        {result.image_url && (
          <img
            src={result.image_url}
            alt="generated"
            className="w-full h-24 object-cover rounded mt-1 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => openMedia(result.image_url, 'image')}
          />
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-pink-500" />
    </div>
  )
})

AIImageNode.displayName = 'AIImageNode'
export default AIImageNode
