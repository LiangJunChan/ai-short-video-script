import { useState, useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Node, Edge } from 'reactflow'
import { videoApi } from '../store/videoApi'
import { SceneConfig } from '../types'
import Canvas from '../components/storyboard/Canvas'
import CanvasToolbar from '../components/storyboard/CanvasToolbar'
import NodeEditorPanel from '../components/storyboard/NodeEditorPanel'
import AISplitPanel from '../components/storyboard/AISplitPanel'
import TemplatePanel from '../components/storyboard/TemplatePanel'
import ExportMenu from '../components/storyboard/ExportMenu'

export default function StoryboardEditorPage() {
  const { id } = useParams<{ id: string }>()
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
  const [isSplitting, setIsSplitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [fitViewKey, setFitViewKey] = useState(0)

  useEffect(() => {
    if (sbData?.data) {
      const { storyboard, nodes: dbNodes, edges: dbEdges } = sbData.data
      setName(storyboard.name)
      const flowNodes: Node[] = (dbNodes || []).map((n) => ({
        id: String(n.id),
        type: n.nodeType,
        position: { x: n.positionX, y: n.positionY },
        data: { nodeType: n.nodeType, config: n.configJson ? JSON.parse(n.configJson) : {} },
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

  const handlePaneDoubleClick = useCallback((position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `temp-${Date.now()}`, type: 'scene', position,
      data: { nodeType: 'scene', config: { script: '', description: '', duration: '' } },
    }
    setNodes((nds) => [...nds, newNode])
  }, [])

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
  }, [])

  const handleNodeConfigSave = useCallback((config: SceneConfig) => {
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

  return (
    <div className="h-screen flex flex-col">
      <CanvasToolbar name={name} onNameChange={setName} onSave={handleSave}
        onAISplit={() => setShowAISplit(true)} onTemplate={() => setShowTemplate(true)}
        onExport={() => setShowExport(true)} isSaving={isSaving} />
      <div className="flex-1 flex">
        <div className="flex-1">
          <Canvas initialNodes={nodes} initialEdges={edges}
            onNodesChange={setNodes} onEdgesChange={setEdges}
            onNodeClick={handleNodeClick} onPaneDoubleClick={handlePaneDoubleClick}
            fitViewKey={fitViewKey} />
        </div>
        {selectedNode && selectedNode.data?.nodeType === 'scene' && (
          <NodeEditorPanel nodeId={selectedNodeId!} config={selectedNode.data.config || {}}
            onSave={handleNodeConfigSave} onClose={() => setSelectedNodeId(null)} />
        )}
      </div>
      {showAISplit && <AISplitPanel onSplit={handleAISplit} onClose={() => setShowAISplit(false)} isLoading={isSplitting} />}
      {showTemplate && <TemplatePanel templates={templatesData?.data?.templates || []}
        onApply={handleApplyTemplate} onSaveAs={handleSaveAsTemplate} onClose={() => setShowTemplate(false)} />}
      {showExport && <ExportMenu storyboardId={storyboardId} onClose={() => setShowExport(false)} />}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-lg">{toast}</div>}
    </div>
  )
}
