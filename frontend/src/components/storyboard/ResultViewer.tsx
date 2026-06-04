interface ResultViewerProps {
  nodeType: string
  result: any
}

export default function ResultViewer({ nodeType, result }: ResultViewerProps) {
  if (!result) {
    return (
      <p className="text-xs text-slate-400 text-center py-2">暂无执行结果</p>
    )
  }

  // Error case
  if (result.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-2">
        <p className="text-xs font-medium text-red-700 mb-1">✗ 执行失败</p>
        <p className="text-xs text-red-600">{result.error}</p>
      </div>
    )
  }

  // ai_text - text result
  if (nodeType === 'ai_text' && result.text) {
    return (
      <div>
        <p className="text-xs font-medium text-slate-700 mb-1">✓ 生成的文案</p>
        <pre className="bg-green-50 border border-green-200 rounded p-2 text-xs text-slate-800 max-h-[200px] overflow-y-auto whitespace-pre-wrap">
          {result.text}
        </pre>
        {result.credits && (
          <p className="text-xs text-slate-400 mt-1">消耗 {result.credits} 积分</p>
        )}
      </div>
    )
  }

  // ai_split - scenes result
  if (nodeType === 'ai_split' && result.scenes) {
    return (
      <div>
        <p className="text-xs font-medium text-slate-700 mb-1">
          ✓ 拆分为 {result.scenes.length} 个分镜
        </p>
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {result.scenes.map((s: any, i: number) => (
            <div key={i} className="bg-green-50 border border-green-200 rounded p-2 text-xs">
              <p className="font-medium text-slate-700">{i + 1}. {s.script || '(无文案)'}</p>
              {s.description && <p className="text-slate-500 mt-1">📷 {s.description}</p>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ai_image - image result
  if (nodeType === 'ai_image' && result.image_url) {
    return (
      <div>
        <p className="text-xs font-medium text-slate-700 mb-1">✓ 生成的图片</p>
        <img src={result.image_url} alt="生成结果" className="w-full rounded border border-slate-200" />
      </div>
    )
  }

  // tts - audio result
  if (nodeType === 'tts' && result.audio_url) {
    return (
      <div>
        <p className="text-xs font-medium text-slate-700 mb-1">✓ 生成的音频</p>
        <audio controls src={result.audio_url} className="w-full" />
      </div>
    )
  }

  // Default: show raw JSON
  return (
    <pre className="bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-800 max-h-[200px] overflow-y-auto">
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}