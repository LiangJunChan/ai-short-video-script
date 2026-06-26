interface ResultViewerProps {
  nodeType: string
  result: any
}

export default function ResultViewer({ nodeType, result }: ResultViewerProps) {
  if (!result) {
    return (
      <p className="text-xs text-av-text-tertiary text-center py-2">暂无执行结果</p>
    )
  }

  // Error case
  if (result.error) {
    return (
      <div className="bg-av-state-error/10 border border-av-state-error/30 rounded p-2">
        <p className="text-xs font-medium text-av-state-error mb-1">✗ 执行失败</p>
        <p className="text-xs text-av-state-error">{result.error}</p>
      </div>
    )
  }

  // ai_text - text result
  if (nodeType === 'ai_text' && result.text) {
    return (
      <div>
        <p className="text-xs font-medium text-av-text-primary mb-1">✓ 生成的文案</p>
        <pre className="bg-av-state-success/10 border border-av-state-success/30 rounded p-2 text-xs text-av-text-secondary max-h-[200px] overflow-y-auto whitespace-pre-wrap">
          {result.text}
        </pre>
        {result.credits && (
          <p className="text-xs text-av-text-tertiary mt-1">消耗 {result.credits} 积分</p>
        )}
      </div>
    )
  }

  // ai_split - scenes result
  if (nodeType === 'ai_split' && result.scenes) {
    return (
      <div>
        <p className="text-xs font-medium text-av-text-primary mb-1">
          ✓ 拆分为 {result.scenes.length} 个分镜
        </p>
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {result.scenes.map((s: any, i: number) => (
            <div key={i} className="bg-av-state-success/10 border border-av-state-success/30 rounded p-2 text-xs">
              <p className="font-medium text-av-text-primary">{i + 1}. {s.script || '(无文案)'}</p>
              {s.description && <p className="text-av-text-tertiary mt-1">📷 {s.description}</p>}
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
        <p className="text-xs font-medium text-av-text-primary mb-1">✓ 生成的图片</p>
        <img src={result.image_url} alt="生成结果" className="w-full rounded border border-av-border-subtle" />
      </div>
    )
  }

  // ai_video - video result
  if (nodeType === 'ai_video' && result.video_url) {
    return (
      <div>
        <p className="text-xs font-medium text-av-text-primary mb-1">✓ 生成的视频</p>
        <video controls src={result.video_url} className="w-full rounded border border-av-border-subtle" />
        <div className="text-xs text-av-text-tertiary mt-1 space-y-0.5">
          {result.task_id && <p>任务 ID：{result.task_id}</p>}
          {result.video_id && <p>视频 ID：{result.video_id}</p>}
          {result.model && <p>模型：{result.model}</p>}
          {result.num_frames && result.frame_rate && <p>参数：{result.num_frames} 帧 / {result.frame_rate} FPS</p>}
        </div>
      </div>
    )
  }

  // tts - audio result
  if (nodeType === 'tts' && result.audio_url) {
    return (
      <div>
        <p className="text-xs font-medium text-av-text-primary mb-1">✓ 生成的音频</p>
        <audio controls src={result.audio_url} className="w-full" />
      </div>
    )
  }

  // Default: show raw JSON
  return (
    <pre className="bg-av-bg-tertiary border border-av-border-subtle rounded p-2 text-xs text-av-text-secondary max-h-[200px] overflow-y-auto">
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}
