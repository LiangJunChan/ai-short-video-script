interface ExecutionProgressBarProps {
  doneCount: number       // done + error 节点数
  total: number           // 可执行 AI 节点总数
  runningLabel: string    // 当前 running 节点名，空串表示无
  errorCount: number      // error 节点数（>0 时进度条尾部变红）
}

export default function ExecutionProgressBar({ doneCount, total, runningLabel, errorCount }: ExecutionProgressBarProps) {
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0
  const finished = doneCount >= total && total > 0

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-av-bg-tertiary border-b border-av-border-subtle">
      <span className="text-xs font-medium text-primary whitespace-nowrap">
        {finished ? '执行完成' : '执行中'}
      </span>
      <div className="flex-1 h-2 bg-av-bg-hover rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${errorCount > 0 ? 'bg-gradient-to-r from-primary to-av-state-error' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-av-text-secondary whitespace-nowrap tabular-nums">
        {doneCount}/{total} 节点{errorCount > 0 && <span className="text-av-state-error">（{errorCount} 失败）</span>}
      </span>
      {!finished && runningLabel && (
        <span className="text-xs text-av-state-warning whitespace-nowrap animate-pulse">
          当前: {runningLabel}
        </span>
      )}
    </div>
  )
}
