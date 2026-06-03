import { videoApi } from '../../store/videoApi'

interface ExecutePanelProps {
  storyboardId: number
  onClose: () => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}

export default function ExecutePanel({ storyboardId, onClose, onSuccess, onError }: ExecutePanelProps) {
  const [execute, { isLoading }] = videoApi.useExecuteStoryboardMutation()
  const { data: historyData } = videoApi.useGetExecutionHistoryQuery(storyboardId)
  const runs = historyData?.data?.runs || []

  const handleExecute = async () => {
    try {
      const result = await execute(storyboardId).unwrap()
      const cost = result.data?.totalCost || 0
      onSuccess(`执行完成，消耗 ${cost} 积分`)
      onClose()
    } catch (err: any) {
      onError(err.data?.message || '执行失败')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-[400px]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-2">执行工作流</h2>
        <p className="text-xs text-slate-400 mb-4">
          按节点连线顺序依次执行所有 AI 节点，每个节点消耗对应积分。
        </p>

        <button
          onClick={handleExecute}
          disabled={isLoading}
          className="w-full py-2.5 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 disabled:opacity-50 mb-4"
        >
          {isLoading ? '执行中...' : '开始执行'}
        </button>

        {runs.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">执行历史</h3>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {runs.map((run: any) => (
                <div key={run.id} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded">
                  <span className={run.status === 'completed' ? 'text-green-600' : 'text-red-600'}>
                    {run.status === 'completed' ? '✓' : '✗'} {run.status}
                  </span>
                  <span className="text-slate-400">
                    {run.totalCredits > 0 ? `${run.totalCredits} 积分` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={onClose} className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-700">
          关闭
        </button>
      </div>
    </div>
  )
}
