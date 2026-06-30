import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Node, Edge } from 'reactflow'
import { videoApi } from '../store/videoApi'
import Canvas from '../components/storyboard/Canvas'
import CanvasToolbar from '../components/storyboard/CanvasToolbar'
import NodeConfigPanel from '../components/storyboard/NodeConfigPanel'
import AISplitPanel from '../components/storyboard/AISplitPanel'
import TemplatePanel from '../components/storyboard/TemplatePanel'
import ExportMenu from '../components/storyboard/ExportMenu'
import ExecutePanel from '../components/storyboard/ExecutePanel'
import ExecutionProgressBar from '../components/storyboard/ExecutionProgressBar'
import Toast from '../components/Toast'

export default function StoryboardEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const storyboardId = Number(id)

  const { data: sbData, isLoading, refetch } = videoApi.useGetStoryboardQuery(storyboardId)
  const [batchUpdate] = videoApi.useBatchUpdateStoryboardMutation()
  const [autoSplit] = videoApi.useAutoSplitStoryboardMutation()
  const { data: templatesData } = videoApi.useGetTemplatesQuery()
  const [applyTemplate] = videoApi.useApplyTemplateMutation()
  const [saveAsTemplate] = videoApi.useSaveAsTemplateMutation()

  const [name, setName] = useState('')
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showAISplit, setShowAISplit] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showExecute, setShowExecute] = useState(false)
  const [isSplitting, setIsSplitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [fitViewKey, setFitViewKey] = useState(0)
  const [showNodeMenu, setShowNodeMenu] = useState(false)
  const [nodeMenuPosition, setNodeMenuPosition] = useState({ x: 0, y: 0 })
  const [activeRunId, setActiveRunId] = useState<number | null>(null)
  const [runProgress, setRunProgress] = useState<{
    done: number; total: number; runningLabel: string; errorCount: number; runStatus: string
  } | null>(null)
  const [triggerGetRunProgress] = videoApi.useLazyGetRunProgressQuery()

  useEffect(() => {
    if (sbData?.data) {
      const { storyboard, nodes: dbNodes, edges: dbEdges } = sbData.data
      setName(storyboard.name)
      // 防御性 JSON.parse：result_json / config_json 历史上可能因为 bug 写过非 JSON 字符串
      // 解析失败时降级为空对象 / 包装为 {error: raw}，避免整个页面崩溃
      const safeParse = (raw: string | undefined, fallback: any = {}): any => {
        if (!raw) return fallback
        try {
          return JSON.parse(raw)
        } catch {
          return { error: raw }
        }
      }
      const flowNodes: Node[] = (dbNodes || []).map((n) => ({
        id: String(n.id),
        type: n.nodeType,
        position: { x: n.positionX, y: n.positionY },
        data: {
          nodeType: n.nodeType,
          config: safeParse(n.configJson, {}),
          state: n.state || 'idle',
          result: n.resultJson ? safeParse(n.resultJson, null) : null,
        },
      }))
      setNodes(flowNodes)
      const flowEdges: Edge[] = (dbEdges || []).map((e) => ({
        id: String(e.id),
        source: String(e.sourceNodeId),
        target: String(e.targetNodeId),
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        style: { stroke: '#5a6478', strokeWidth: 2 },
      }))
      setEdges(flowEdges)

      // Calculate connection state for each node
      const edgeTargetIds = new Set((dbEdges || []).map((e: any) => String(e.targetNodeId)))
      const flowNodesWithState: Node[] = flowNodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          hasIncomingEdge: edgeTargetIds.has(n.id),
        }
      }))
      setNodes(flowNodesWithState)
    }
  }, [sbData])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const nodeTypeLabel = (t: string) => ({
    ai_text: 'AI 文案',
    ai_image: 'AI 图片',
    ai_split: 'AI 分镜',
    ai_video: 'AI 视频',
    tts: 'TTS 配音',
  }[t] || t)

  // 执行中轮询：每 1.5s 拉 run 进度，合并节点 state 进画布
  useEffect(() => {
    if (activeRunId === null) return
    let cancelled = false

    const poll = async () => {
      try {
        const res = await triggerGetRunProgress({ storyboardId, runId: activeRunId }).unwrap()
        if (cancelled) return
        const data = res.data
        const nodeStates = data.nodes

        // 合并 state 进画布节点（只更新 state，保留 position/config）
        setNodes((nds) => nds.map((n) => {
          const matched = nodeStates.find((ns) => String(ns.id) === n.id)
          if (!matched) return n
          return { ...n, data: { ...n.data, state: matched.state } }
        }))

        // 计算进度（只统计可执行 AI 节点）
        const aiTypes = ['ai_text', 'ai_image', 'ai_split', 'ai_video', 'tts']
        const aiNodes = nodeStates.filter((ns) => aiTypes.includes(ns.nodeType))
        const done = aiNodes.filter((ns) => ns.state === 'done' || ns.state === 'error').length
        const errorCount = aiNodes.filter((ns) => ns.state === 'error').length
        const running = aiNodes.find((ns) => ns.state === 'running')
        const runningLabel = running ? nodeTypeLabel(running.nodeType) : ''
        setRunProgress({ done, total: aiNodes.length, runningLabel, errorCount, runStatus: data.run.status })

        // run 终态 → 停止轮询
        if (data.run.status !== 'running') {
          setActiveRunId(null)
          setRunProgress(null)
          refetch()
          const msg = data.run.status === 'completed'
            ? '执行完成'
            : data.run.status === 'partial_error'
              ? '执行完成（部分节点失败）'
              : '执行结束'
          showToast(msg)
        }
      } catch {
        // 单次轮询失败容忍，继续轮询
      }
    }

    poll()
    const timer = setInterval(poll, 1500)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [activeRunId, storyboardId, triggerGetRunProgress, refetch])

  // 构造 batchUpdate 请求体（给工具栏保存、配置面板保存、执行前自动保存复用）
  const buildBatchUpdatePayload = useCallback(() => {
    // 新节点的 id 用负数 -(idx+1)，避免和数据库已有节点的 id 冲突
    // 后端根据 n.ID <= 0 判定为新节点，按数组顺序 (i+1) 创建
    const newNodeIndexMap = new Map<string, number>()
    const saveNodes = nodes.map((n, idx) => {
      const isNew = n.data?.isNew === true
      if (isNew) {
        newNodeIndexMap.set(String(n.id), idx + 1)
        return {
          id: -(idx + 1),
          nodeType: n.data?.nodeType || 'scene',
          positionX: n.position.x,
          positionY: n.position.y,
          configJson: JSON.stringify(n.data?.config || {}),
        }
      }
      return {
        id: Number(n.id),
        nodeType: n.data?.nodeType || 'scene',
        positionX: n.position.x,
        positionY: n.position.y,
        configJson: JSON.stringify(n.data?.config || {}),
      }
    })

    const saveEdges = edges.map((e) => {
      const sourceNode = nodes.find(n => n.id === e.source)
      const targetNode = nodes.find(n => n.id === e.target)
      const sourceIsNew = sourceNode?.data?.isNew === true
      const targetIsNew = targetNode?.data?.isNew === true

      return {
        sourceNodeId: sourceIsNew ? (newNodeIndexMap.get(String(e.source)) || 0) : Number(e.source),
        targetNodeId: targetIsNew ? (newNodeIndexMap.get(String(e.target)) || 0) : Number(e.target),
        sourceHandle: e.sourceHandle || '',
        targetHandle: e.targetHandle || '',
      }
    })

    return { saveNodes, saveEdges }
  }, [nodes, edges])

  // 同步整张画布到数据库，返回是否有未保存的新节点
  const flushCanvasToDB = useCallback(async (): Promise<{ savedCount: number; ok: boolean }> => {
    const newCount = nodes.filter(n => n.data?.isNew === true).length
    if (newCount === 0) return { savedCount: 0, ok: true }
    const { saveNodes, saveEdges } = buildBatchUpdatePayload()
    try {
      await batchUpdate({
        id: storyboardId,
        nodes: saveNodes,
        edges: saveEdges,
      }).unwrap()
      setNodes((nds) => nds.map(n => ({ ...n, data: { ...n.data, isNew: false } })))
      return { savedCount: newCount, ok: true }
    } catch {
      return { savedCount: 0, ok: false }
    }
  }, [nodes, buildBatchUpdatePayload, batchUpdate, storyboardId])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    const { ok } = await flushCanvasToDB()
    if (ok) {
      showToast('保存成功')
      refetch()
    } else {
      showToast('保存失败')
    }
    setIsSaving(false)
  }, [flushCanvasToDB, refetch])

  const handlePaneContextMenu = useCallback((position: { x: number; y: number }) => {
    setNodeMenuPosition(position)
    setShowNodeMenu(true)
  }, [])

  const handleCreateNode = useCallback((nodeType: string) => {
    const configs: Record<string, any> = {
      scene: { script: '', description: '', duration: '' },
      ai_text: { prompt: '', style: '亲切', word_count: 200 },
      ai_image: { prompt: '', size: '1024x768', response_format: 'url' },
      ai_split: { structure: 'hook-content-ending', split_count: 6 },
      ai_video: { mode: 'text_to_video', prompt: '', image_url: '', width: 576, height: 1024, num_frames: 121, frame_rate: 24, negative_prompt: '' },
      tts: { voice: 'female_warm', speed: 1.0 },
    }

    const newNode: Node = {
      id: `temp-${Date.now()}`,
      type: nodeType,
      position: nodeMenuPosition,
      data: {
        nodeType,
        config: configs[nodeType] || {},
        state: 'idle',
        result: null,
        isNew: true,
      },
    }
    setNodes((nds) => [...nds, newNode])
    setShowNodeMenu(false)
  }, [nodeMenuPosition])

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
  }, [])

  const handleNodeConfigSave = useCallback(async (config: Record<string, any>) => {
    if (!selectedNodeId) return
    const targetIdx = nodes.findIndex(n => n.id === selectedNodeId)
    if (targetIdx < 0) return
    const isNewNode = nodes[targetIdx].data?.isNew === true

    // 先在前端 state 写入新 config（异步）
    setNodes((nds) => nds.map((n) =>
      n.id === selectedNodeId ? { ...n, data: { ...n.data, config } } : n
    ))

    // 直接用最新 config 构造 payload，避免闭包拿到旧 state
    // 新节点 id 用负数 -(idx+1)，避免撞已有节点 id
    const newNodeIndexMap = new Map<string, number>()
    const saveNodes = nodes.map((n, idx) => {
      const isNew = n.data?.isNew === true
      const cfg = idx === targetIdx ? config : n.data?.config
      if (isNew) {
        newNodeIndexMap.set(String(n.id), idx + 1)
        return {
          id: -(idx + 1),
          nodeType: n.data?.nodeType || 'scene',
          positionX: n.position.x,
          positionY: n.position.y,
          configJson: JSON.stringify(cfg || {}),
        }
      }
      return {
        id: Number(n.id),
        nodeType: n.data?.nodeType || 'scene',
        positionX: n.position.x,
        positionY: n.position.y,
        configJson: JSON.stringify(cfg || {}),
      }
    })
    const saveEdges = edges.map((e) => {
      const sourceNode = nodes.find(n => n.id === e.source)
      const targetNode = nodes.find(n => n.id === e.target)
      const sourceIsNew = sourceNode?.data?.isNew === true
      const targetIsNew = targetNode?.data?.isNew === true
      return {
        sourceNodeId: sourceIsNew ? (newNodeIndexMap.get(String(e.source)) || 0) : Number(e.source),
        targetNodeId: targetIsNew ? (newNodeIndexMap.get(String(e.target)) || 0) : Number(e.target),
        sourceHandle: e.sourceHandle || '',
        targetHandle: e.targetHandle || '',
      }
    })
    try {
      await batchUpdate({
        id: storyboardId,
        nodes: saveNodes,
        edges: saveEdges,
      }).unwrap()
      setNodes((nds) => nds.map(n => ({ ...n, data: { ...n.data, isNew: false } })))
      showToast(isNewNode ? '已保存到服务器' : '配置已更新')
      refetch()
    } catch {
      showToast('保存失败')
    }
  }, [selectedNodeId, nodes, edges, batchUpdate, storyboardId, refetch])

  const handleAISplit = useCallback(async (text: string) => {
    setIsSplitting(true)
    try {
      const result = await autoSplit({ id: storyboardId, text }).unwrap()
      showToast(`拆分成功，生成 ${result.data.scenes.length} 个分镜`)
      await refetch()
      setFitViewKey((k) => k + 1)
      setShowAISplit(false)
    } catch (err: any) {
      showToast(err.data?.message || '拆分失败')
    }
    setIsSplitting(false)
  }, [storyboardId, autoSplit, refetch])

  const handleApplyTemplate = useCallback(async (templateId: number) => {
    try {
      await applyTemplate({ storyboardId, templateId }).unwrap()
      showToast('应用成功')
      await refetch()
      setFitViewKey((k) => k + 1)
      setShowTemplate(false)
    } catch {
      showToast('应用失败')
    }
  }, [storyboardId, applyTemplate, refetch])

  const handleSaveAsTemplate = useCallback(async () => {
    const templateName = prompt('输入模板名称')
    if (!templateName) return
    try {
      await saveAsTemplate({ storyboardId, name: templateName }).unwrap()
      showToast('保存成功')
    } catch {
      showToast('保存失败')
    }
  }, [storyboardId, saveAsTemplate])

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null

  if (isLoading) return <div className="flex items-center justify-center h-screen text-av-text-tertiary">加载中...</div>

  const sceneNodes = nodes.filter((n) => n.data?.nodeType === 'scene')
  const showEmptyHint = sceneNodes.length === 0

  return (
    <div className="h-screen flex flex-col">
      <CanvasToolbar name={name} onNameChange={setName} onSave={handleSave}
        onAISplit={() => setShowAISplit(true)} onTemplate={() => setShowTemplate(true)}
        onExport={() => setShowExport(true)} onExecute={() => { if (!activeRunId) setShowExecute(true) }} onBack={() => navigate('/storyboards')}
        isSaving={isSaving} />
      {activeRunId && runProgress && (
        <ExecutionProgressBar
          doneCount={runProgress.done}
          total={runProgress.total}
          runningLabel={runProgress.runningLabel}
          errorCount={runProgress.errorCount}
        />
      )}
      <div className="flex-1 flex">
        <div className="flex-1 relative">
          <Canvas initialNodes={nodes} initialEdges={edges}
            onNodesChange={setNodes} onEdgesChange={setEdges}
            onNodeClick={handleNodeClick} onPaneContextMenu={handlePaneContextMenu}
            fitViewKey={fitViewKey} />
          {showEmptyHint && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-av-bg-elevated/90 rounded-xl p-6 text-center shadow-av-sm border border-av-border-subtle pointer-events-auto">
                <p className="text-av-text-secondary text-sm mb-3">画布为空，开始创作吧</p>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setShowAISplit(true)}
                    className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100">
                    AI 智能分镜
                  </button>
                  <button onClick={() => setShowTemplate(true)}
                    className="px-3 py-1.5 text-xs font-medium text-av-state-warning bg-av-state-warning/10 rounded-lg hover:bg-av-state-warning/20">
                    从模板创建
                  </button>
                </div>
                <p className="text-av-text-tertiary text-xs mt-2">或双击画布空白处添加分镜节点</p>
              </div>
            </div>
          )}
        </div>
        {selectedNode && selectedNode.data?.nodeType && (
          <NodeConfigPanel
            nodeId={selectedNodeId!}
            nodeType={selectedNode.data.nodeType}
            config={selectedNode.data.config || {}}
            result={selectedNode.data.result}
            onSave={handleNodeConfigSave}
            onClose={() => setSelectedNodeId(null)} />
        )}
      </div>
      {showAISplit && <AISplitPanel onSplit={handleAISplit} onClose={() => setShowAISplit(false)} isLoading={isSplitting} />}
      {showTemplate && <TemplatePanel templates={templatesData?.data?.templates || []}
        onApply={handleApplyTemplate} onSaveAs={handleSaveAsTemplate} onClose={() => setShowTemplate(false)} />}
      {showExport && <ExportMenu storyboardId={storyboardId} onClose={() => setShowExport(false)} />}
      {showExecute && <ExecutePanel storyboardId={storyboardId} onClose={() => setShowExecute(false)}
        onSuccess={showToast} onError={showToast}
        onStartRun={(runId) => setActiveRunId(runId)}
        onBeforeExecute={flushCanvasToDB} />}
      {showNodeMenu && (
        <div className="fixed inset-0 z-av-modal" onClick={() => setShowNodeMenu(false)}>
          <div className="absolute bg-av-bg-secondary rounded-xl shadow-av-lg border border-av-border-subtle p-2 w-[200px]"
            style={{ left: Math.min(nodeMenuPosition.x, window.innerWidth - 220), top: Math.min(nodeMenuPosition.y, window.innerHeight - 300) }}
            onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-av-text-tertiary px-2 py-1 mb-1">选择节点类型</p>
            <button onClick={() => handleCreateNode('scene')}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-av-bg-hover flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary"></span> 分镜节点
            </button>
            <button onClick={() => handleCreateNode('ai_text')}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-av-bg-hover flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-violet-400"></span> AI 文案
            </button>
            <button onClick={() => handleCreateNode('ai_image')}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-av-bg-hover flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-pink-400"></span> AI 图片
            </button>
            <button onClick={() => handleCreateNode('ai_split')}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-av-bg-hover flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-400"></span> AI 分镜
            </button>
            <button onClick={() => handleCreateNode('ai_video')}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-av-bg-hover flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-400"></span> AI 视频
            </button>
            <button onClick={() => handleCreateNode('tts')}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-av-bg-hover flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-teal-400"></span> TTS 配音
            </button>
          </div>
        </div>
      )}
      {toast && <Toast message={toast} />}
    </div>
  )
}
