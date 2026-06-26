import { useState } from 'react'

interface AISplitPanelProps {
  onSplit: (text: string) => void
  onClose: () => void
  isLoading: boolean
}

export default function AISplitPanel({ onSplit, onClose, isLoading }: AISplitPanelProps) {
  const [text, setText] = useState('')

  return (
    <div className="fixed inset-0 z-av-modal flex items-center justify-center bg-[rgba(8,9,13,0.7)] backdrop-blur-sm">
      <div className="surface neon-border rounded-xl p-6 w-[500px]">
        <h2 className="text-lg font-semibold mb-2 text-av-text-primary">AI 智能分镜</h2>
        <p className="text-xs text-av-text-tertiary mb-4">输入文案，AI 自动拆分为分镜节点（消耗 5 积分）</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="粘贴你的短视频文案..."
          className="input-field w-full px-3 py-2 text-sm resize-none mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">取消</button>
          <button
            onClick={() => onSplit(text)}
            disabled={!text.trim() || isLoading}
            className="px-4 py-2 bg-purple-500 text-av-text-inverse text-sm rounded-lg hover:bg-purple-600 disabled:opacity-50"
          >
            {isLoading ? '拆分中...' : '开始拆分'}
          </button>
        </div>
      </div>
    </div>
  )
}
