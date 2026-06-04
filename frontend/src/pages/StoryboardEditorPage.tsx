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

  useEffect(() => {
    if (sbData?.data) {
      const { storyboard, nodes: dbNodes, edges: dbEdges } = sbData.data
      setName(storyboard.name)
      const flowNodes: Node[] = (dbNodes || []).map((n) => ({
        id: String(n.id),
        type: n.nodeType,
        position: { x: n.positionX, y: n.positionY },
        data: {
          nodeType: n.nodeType,
          config: n.configJson ? JSON.parse(n.configJson) : {},
          state: n.state || 'idle',
          result: n.resultJson ? JSON.parse(n.resultJson) : null,
        },
      }))
      setNodes(flowNodes)
      const flowEdges: Edge[] = (dbEdges || []).map((e) => ({
        id: String(e.id),
        source: String(e.sourceNodeId),
        target: String(e.targetNodeId),
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        animated: true,
      }))
      setEdges(flowEdges)
    }
  }, [sbData])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await batchUpdate({
        id: storyboardId,
        nodes: nodes.map((n) => ({
          id: Number(n.id), nodeType: n.data?.nodeType || 'scene',
          positionX: n.position.x, positionY: n.position.y,
          configJson: JSON.stringify(n.data?.config || {}),
        })),
        edges: edges.map((e) => ({
          sourceNodeId: Number(e.source), targetNodeId: Number(e.target),
          sourceHandle: e.sourceHandle || '', targetHandle: e.targetHandle || '',
        })),
      }).unwrap()
      showToast('保存成功')
      refetch()
    } catch {
      showToast('保存失败')
    }
    setIsSaving(false)
  }, [storyboardId, nodes, edges, batchUpdate, refetch])

  const handlePaneContextMenu = useCallback((position: { x: number; y: number }) => {
    setNodeMenuPosition(position)
    setShowNodeMenu(true)
  }, [])

  const handleCreateNode = useCallback((nodeType: string) => {
    const configs: Record<string, any> = {
      scene: { script: '', description: '', duration: '' },
      ai_text: { prompt: '', style: '亲切', word_count: 200 },
      ai_image: { prompt: '' },
      ai_split: { structure: 'hook-content-ending', split_count: 6 },
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
      },
    }
    setNodes((nds) => [...nds, newNode])
    setShowNodeMenu(false)
  }, [nodeMenuPosition])

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
  }, [])

  const handleNodeConfigSave = useCallback((config: Record<string, any>) => {
    if (!selectedNodeId) return
    setNodes((nds) => nds.map((n) =>
      n.id === selectedNodeId ? { ...n, data: { ...n.data, config } } : n
    ))
    setSelectedNodeId(null)
  }, [selectedNodeId])

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

  if (isLoading) return <div className="flex items-center justify-center h-screen text-slate-400">加载中...</div>

  const sceneNodes = nodes.filter((n) => n.data?.nodeType === 'scene')
  const showEmptyHint = sceneNodes.length === 0

  return (
    <div className="h-screen flex flex-col">
      <CanvasToolbar name={name} onNameChange={setName} onSave={handleSave}
        onAISplit={() => setShowAISplit(true)} onTemplate={() => setShowTemplate(true)}
        onExport={() => setShowExport(true)} onExecute={() => setShowExecute(true)} onBack={() => navigate('/storyboards')}
        isSaving={isSaving} />
      <div className="flex-1 flex">
        <div className="flex-1 relative">
          <Canvas initialNodes={nodes} initialEdges={edges}
            onNodesChange={setNodes} onEdgesChange={setEdges}
            onNodeClick={handleNodeClick} onPaneContextMenu={handlePaneContextMenu}
            fitViewKey={fitViewKey} />
          {showEmptyHint && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 rounded-xl p-6 text-center shadow-sm border border-slate-200 pointer-events-auto">
                <p className="text-slate-500 text-sm mb-3">画布为空，开始创作吧</p>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setShowAISplit(true)}
                    className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100">
                    AI 智能分镜
                  </button>
                  <button onClick={() => setShowTemplate(true)}
                    className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100">
                    从模板创建
                  </button>
                </div>
                <p className="text-slate-400 text-xs mt-2">或双击画布空白处添加分镜节点</p>
              </div>
            </div>
          )}
        </div>
        {selectedNode && selectedNode.data?.nodeType && (
          <NodeConfigPanel
            nodeId={selectedNodeId!}
            nodeType={selectedNode.data.nodeType}
            config={selectedNode.data.config || {}}
            onSave={handleNodeConfigSave}
            onClose={() => setSelectedNodeId(null)} />
        )}
      </div>
      {showAISplit && <AISplitPanel onSplit={handleAISplit} onClose={() => setShowAISplit(false)} isLoading={isSplitting} />}
      {showTemplate && <TemplatePanel templates={templatesData?.data?.templates || []}
        onApply={handleApplyTemplate} onSaveAs={handleSaveAsTemplate} onClose={() => setShowTemplate(false)} />}
      {showExport && <ExportMenu storyboardId={storyboardId} onClose={() => setShowExport(false)} />}
      {showExecute && <ExecutePanel storyboardId={storyboardId} onClose={() => setShowExecute(false)}
        onSuccess={showToast} onError={showToast} onExecuted={() => refetch()} />}
      {showNodeMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setShowNodeMenu(false)}>
          <div className="absolute bg-white rounded-xl shadow-lg border border-slate-200 p-2 w-[200px]"
            style={{ left: Math.min(nodeMenuPosition.x, window.innerWidth - 220), top: Math.min(nodeMenuPosition.y, window.innerHeight - 300) }}
            onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-slate-400 px-2 py-1 mb-1">选择节点类型</p>
            <button onClick={() => handleCreateNode('scene')}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-400"></span> 分镜节点
            </button>
            <button onClick={() => handleCreateNode('ai_text')}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-violet-400"></span> AI 文案
            </button>
            <button onClick={() => handleCreateNode('ai_image')}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-pink-400"></span> AI 图片
            </button>
            <button onClick={() => handleCreateNode('ai_split')}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-400"></span> AI 分镜
            </button>
            <button onClick={() => handleCreateNode('tts')}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-teal-400"></span> TTS 配音
            </button>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-lg">{toast}</div>}
    </div>
  )
}
