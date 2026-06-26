import { useState } from 'react'
import { videoApi } from '../../store/videoApi'

interface ExecutePanelProps {
  storyboardId: number
  onClose: () => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  onStartRun: (runId: number) => void
  onBeforeExecute?: () => Promise<{ savedCount: number; ok: boolean }>
}

export default function ExecutePanel({ storyboardId, onClose, onSuccess, onError, onStartRun, onBeforeExecute }: ExecutePanelProps) {
  const [execute, { isLoading }] = videoApi.useExecuteStoryboardMutation()
  const { data: historyData } = videoApi.useGetExecutionHistoryQuery(storyboardId)
  const runs = historyData?.data?.runs || []
  const [force, setForce] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const handleExecute = async () => {
    if (syncing) return
    setSyncing(true)
    try {
      // 执行前先自动同步整张画布，确保内存中的新节点入数据库
      if (onBeforeExecute) {
        const sync = await onBeforeExecute()
        if (!sync.ok) {
          onError('画布自动保存失败，请重试')
          setSyncing(false)
          return
        }
        if (sync.savedCount > 0) {
          onSuccess(`已自动保存 ${sync.savedCount} 个新节点`)
        }
      }

      // 异步执行：后端秒回 runId，不等执行完成
      const result = await execute({ id: storyboardId, force }).unwrap()
      const runId = result.data?.runId
      if (!runId) {
        onError('启动执行失败')
        return
      }
      onStartRun(runId)
      onClose()
    } catch (err: any) {
      if (err?.status === 409) {
        onError('已有执行进行中，请等待完成')
      } else {
        onError(err.data?.message || '启动执行失败')
      }
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-av-modal flex items-center justify-center bg-[rgba(8,9,13,0.7)] backdrop-blur-sm" onClick={onClose}>
      <div className="surface neon-border rounded-xl p-6 w-[400px]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-2">执行工作流</h2>
        <p className="text-xs text-av-text-tertiary mb-1">
          按节点连线顺序依次执行所有 AI 节点（ai_text / ai_image / ai_split / ai_video / tts），图片/视频生成第一版暂不扣积分。
        </p>
        <p className="text-xs text-av-state-warning mb-3">
          注意：分镜（scene）节点是数据容器，不会被执行。
        </p>

        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
            className="w-4 h-4 rounded border-av-border-strong text-primary focus:ring-primary/30"
          />
          <span className="text-xs text-av-text-secondary">
            强制重新执行（包括已成功的节点）
          </span>
        </label>

        <button
          onClick={handleExecute}
          disabled={isLoading || syncing}
          className="w-full py-2.5 btn-primary text-sm disabled:opacity-50 mb-4"
        >
          {syncing ? '同步画布中...' : isLoading ? '启动中...' : force ? '强制执行' : '开始执行'}
        </button>

        {runs.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-av-text-primary mb-2">执行历史</h3>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {runs.map((run: any) => (
                <div key={run.id} className="flex items-center justify-between text-xs p-2 bg-av-bg-tertiary rounded">
                  <span className={run.status === 'completed' ? 'text-av-state-success' : 'text-av-state-error'}>
                    {run.status === 'completed' ? '✓' : '✗'} {run.status}
                  </span>
                  <span className="text-av-text-tertiary">
                    {run.totalCredits > 0 ? `${run.totalCredits} 积分` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={onClose} className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-av-text-primary">
          关闭
        </button>
      </div>
    </div>
  )
}
