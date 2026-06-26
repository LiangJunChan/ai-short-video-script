import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import UnsavedBadge from './UnsavedBadge'

const AISplitNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config || {}
  const result = data.result || {}
  const sceneCount = result.scenes?.length || 0

  return (
    <div className={`relative shadow-av-md rounded-lg bg-av-bg-secondary border-2 min-w-[250px] max-w-[300px] ${
      selected ? 'border-indigo-500' : 'border-av-border-subtle'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500" />
      {data.hasIncomingEdge === false && (
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-av-state-warning rounded-full border-2 border-av-bg-primary" title="需要上游输入" />
      )}
      <UnsavedBadge show={data.isNew === true} />

      <div className="px-3 py-2 bg-indigo-500/10 border-b border-av-border-subtle rounded-t-lg flex items-center justify-between">
        <span className="text-xs font-medium text-indigo-400">✂️ AI 分镜</span>
        {data.state === 'running' && <span className="text-xs text-av-state-warning animate-pulse">拆分中...</span>}
        {data.state === 'done' && <span className="text-xs text-av-state-success">✓ {sceneCount}个分镜</span>}
        {data.state === 'error' && <span className="text-xs text-av-state-error">✗ 失败</span>}
      </div>

      <div className="px-3 py-2 space-y-1">
        {config.structure && <p className="text-xs text-av-text-tertiary">结构：{config.structure}</p>}
        {config.split_count && <p className="text-xs text-av-text-tertiary">目标：{config.split_count}个分镜</p>}
        {result.scenes && (
          <div className="text-xs text-av-state-success bg-av-state-success/10 p-1 rounded">
            {result.scenes.slice(0, 3).map((s: any, i: number) => (
              <p key={i} className="line-clamp-1">{i + 1}. {s.script}</p>
            ))}
            {sceneCount > 3 && <p className="text-av-text-tertiary">...还有{sceneCount - 3}个</p>}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500" />
    </div>
  )
})

AISplitNode.displayName = 'AISplitNode'
export default AISplitNode
