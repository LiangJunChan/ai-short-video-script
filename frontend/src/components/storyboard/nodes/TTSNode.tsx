import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import UnsavedBadge from './UnsavedBadge'

const TTSNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config || {}
  const result = data.result || {}

  const voiceLabels: Record<string, string> = {
    female_warm: '温柔女声',
    male_deep: '沉稳男声',
    female_cheerful: '活泼女声',
  }

  return (
    <div className={`relative shadow-av-md rounded-lg bg-av-bg-secondary border-2 min-w-[250px] max-w-[300px] ${
      selected ? 'border-teal-500' : 'border-av-border-subtle'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-teal-500" />
      {data.hasIncomingEdge === false && (
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-av-state-warning rounded-full border-2 border-av-bg-primary" title="需要上游输入" />
      )}
      <UnsavedBadge show={data.isNew === true} />

      <div className="px-3 py-2 bg-teal-500/10 border-b border-av-border-subtle rounded-t-lg flex items-center justify-between">
        <span className="text-xs font-medium text-teal-400">🎙️ TTS 配音</span>
        {data.state === 'running' && <span className="text-xs text-av-state-warning animate-pulse">合成中...</span>}
        {data.state === 'done' && <span className="text-xs text-av-state-success">✓ 完成</span>}
        {data.state === 'error' && <span className="text-xs text-av-state-error">✗ 失败</span>}
      </div>

      <div className="px-3 py-2 space-y-1">
        {config.voice && <p className="text-xs text-av-text-tertiary">音色：{voiceLabels[config.voice] || config.voice}</p>}
        {config.speed && <p className="text-xs text-av-text-tertiary">语速：{config.speed}x</p>}
        {result.audio_url && (
          <audio controls src={result.audio_url} className="w-full h-8 mt-1" />
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-teal-500" />
    </div>
  )
})

TTSNode.displayName = 'TTSNode'
export default TTSNode
