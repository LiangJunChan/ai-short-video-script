import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

const TTSNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config || {}
  const result = data.result || {}

  const voiceLabels: Record<string, string> = {
    female_warm: '温柔女声',
    male_deep: '沉稳男声',
    female_cheerful: '活泼女声',
  }

  return (
    <div className={`shadow-md rounded-lg bg-white border-2 min-w-[250px] max-w-[300px] ${
      selected ? 'border-teal-500' : 'border-slate-200'
    }`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-teal-500" />
      {data.hasIncomingEdge === false && (
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-amber-400 rounded-full border-2 border-white" title="需要上游输入" />
      )}

      <div className="px-3 py-2 bg-teal-50 border-b border-slate-100 rounded-t-lg flex items-center justify-between">
        <span className="text-xs font-medium text-teal-700">🎙️ TTS 配音</span>
        {data.state === 'running' && <span className="text-xs text-amber-600 animate-pulse">合成中...</span>}
        {data.state === 'done' && <span className="text-xs text-green-600">✓ 完成</span>}
        {data.state === 'error' && <span className="text-xs text-red-600">✗ 失败</span>}
      </div>

      <div className="px-3 py-2 space-y-1">
        {config.voice && <p className="text-xs text-slate-500">音色：{voiceLabels[config.voice] || config.voice}</p>}
        {config.speed && <p className="text-xs text-slate-500">语速：{config.speed}x</p>}
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
