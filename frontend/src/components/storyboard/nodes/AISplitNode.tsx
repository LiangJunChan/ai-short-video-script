import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

const AISplitNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config || {}
  const result = data.result || {}
  const sceneCount = result.scenes?.length || 0

  return (
    <div className={`shadow-md rounded-lg bg-white border-2 min-w-[250px] max-w-[300px] ${
      selected ? 'border-indigo-500' : 'border-slate-200'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500" />

      <div className="px-3 py-2 bg-indigo-50 border-b border-slate-100 rounded-t-lg flex items-center justify-between">
        <span className="text-xs font-medium text-indigo-700">✂️ AI 分镜</span>
        {data.state === 'running' && <span className="text-xs text-amber-600 animate-pulse">拆分中...</span>}
        {data.state === 'done' && <span className="text-xs text-green-600">✓ {sceneCount}个分镜</span>}
        {data.state === 'error' && <span className="text-xs text-red-600">✗ 失败</span>}
      </div>

      <div className="px-3 py-2 space-y-1">
        {config.structure && <p className="text-xs text-slate-500">结构：{config.structure}</p>}
        {config.split_count && <p className="text-xs text-slate-500">目标：{config.split_count}个分镜</p>}
        {result.scenes && (
          <div className="text-xs text-green-700 bg-green-50 p-1 rounded">
            {result.scenes.slice(0, 3).map((s: any, i: number) => (
              <p key={i} className="line-clamp-1">{i + 1}. {s.script}</p>
            ))}
            {sceneCount > 3 && <p className="text-slate-400">...还有{sceneCount - 3}个</p>}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500" />
    </div>
  )
})

AISplitNode.displayName = 'AISplitNode'
export default AISplitNode
