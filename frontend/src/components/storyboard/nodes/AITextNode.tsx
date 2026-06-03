import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

const AITextNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config || {}
  const result = data.result || {}

  return (
    <div className={`shadow-md rounded-lg bg-white border-2 min-w-[250px] max-w-[300px] ${
      selected ? 'border-violet-500' : 'border-slate-200'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-violet-500" />

      <div className="px-3 py-2 bg-violet-50 border-b border-slate-100 rounded-t-lg flex items-center justify-between">
        <span className="text-xs font-medium text-violet-700">✨ AI 文案</span>
        {data.state === 'running' && <span className="text-xs text-amber-600 animate-pulse">执行中...</span>}
        {data.state === 'done' && <span className="text-xs text-green-600">✓ 完成</span>}
        {data.state === 'error' && <span className="text-xs text-red-600">✗ 失败</span>}
      </div>

      <div className="px-3 py-2 space-y-1">
        {config.style && <p className="text-xs text-slate-500">风格：{config.style}</p>}
        {config.word_count && <p className="text-xs text-slate-500">字数：约{config.word_count}字</p>}
        {config.prompt && <p className="text-xs text-slate-800 line-clamp-2">📝 {config.prompt}</p>}
        {result.text && <p className="text-xs text-green-700 line-clamp-3 mt-1 bg-green-50 p-1 rounded">📄 {result.text}</p>}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-violet-500" />
    </div>
  )
})

AITextNode.displayName = 'AITextNode'
export default AITextNode
