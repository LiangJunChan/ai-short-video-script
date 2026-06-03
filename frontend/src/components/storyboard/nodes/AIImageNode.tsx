import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

const AIImageNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config || {}
  const result = data.result || {}

  return (
    <div className={`shadow-md rounded-lg bg-white border-2 min-w-[250px] max-w-[300px] ${
      selected ? 'border-pink-500' : 'border-slate-200'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-pink-500" />

      <div className="px-3 py-2 bg-pink-50 border-b border-slate-100 rounded-t-lg flex items-center justify-between">
        <span className="text-xs font-medium text-pink-700">🖼️ AI 图片</span>
        {data.state === 'running' && <span className="text-xs text-amber-600 animate-pulse">生成中...</span>}
        {data.state === 'done' && <span className="text-xs text-green-600">✓ 完成</span>}
        {data.state === 'error' && <span className="text-xs text-red-600">✗ 失败</span>}
      </div>

      <div className="px-3 py-2 space-y-1">
        {config.prompt && <p className="text-xs text-slate-800 line-clamp-2">📝 {config.prompt}</p>}
        {result.image_url && (
          <img src={result.image_url} alt="generated" className="w-full h-24 object-cover rounded mt-1" />
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-pink-500" />
    </div>
  )
})

AIImageNode.displayName = 'AIImageNode'
export default AIImageNode
