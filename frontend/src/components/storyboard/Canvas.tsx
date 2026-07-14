import { useCallback, useRef, useEffect, useMemo } from 'react'
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  NodeChange,
  EdgeChange,
} from 'reactflow'
import 'reactflow/dist/style.css'

import SceneNode from './SceneNode'
import AITextNode from './nodes/AITextNode'
import AIImageNode from './nodes/AIImageNode'
import AISplitNode from './nodes/AISplitNode'
import TTSNode from './nodes/TTSNode'
import AIVideoNode from './nodes/AIVideoNode'

interface CanvasProps {
  initialNodes: Node[]
  initialEdges: Edge[]
  onNodesChange: (nodes: Node[]) => void
  onEdgesChange: (edges: Edge[]) => void
  onNodeClick: (nodeId: string) => void
  onPaneContextMenu: (screenPosition: { x: number; y: number }, flowPosition: { x: number; y: number }) => void
  fitViewKey?: number
}

export default function Canvas({
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onPaneContextMenu,
  fitViewKey,
}: CanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, handleNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, handleEdgesChange] = useEdgesState(initialEdges)
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)

  const nodeTypes = useMemo(() => ({
    scene: SceneNode,
    start: SceneNode,
    end: SceneNode,
    ai_text: AITextNode,
    ai_image: AIImageNode,
    ai_split: AISplitNode,
    ai_video: AIVideoNode,
    tts: TTSNode,
  }), [])

  // Sync initial data when it changes
  useEffect(() => {
    setNodes(initialNodes)
    if (fitViewKey && initialNodes.length > 0 && reactFlowInstance.current) {
      setTimeout(() => reactFlowInstance.current?.fitView({ padding: 0.2 }), 200)
    }
  }, [initialNodes, setNodes, fitViewKey])

  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  const onNodesChangeWrapper = useCallback(
    (changes: NodeChange[]) => {
      handleNodesChange(changes)
      // 立即同步给父组件，避免 100ms 延迟导致父组件的 setNodes 还没生效
      // 就触发了 batchUpdate，把还没同步过来的新节点/边丢失
      setNodes((nds) => {
        onNodesChange(nds)
        return nds
      })
    },
    [handleNodesChange, onNodesChange, setNodes]
  )

  const onEdgesChangeWrapper = useCallback(
    (changes: EdgeChange[]) => {
      handleEdgesChange(changes)
      // 立即同步给父组件，避免延迟导致 batchUpdate 用过期 edges 重建数据库
      setEdges((eds) => {
        onEdgesChange(eds)
        return eds
      })
    },
    [handleEdgesChange, onEdgesChange, setEdges]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      // 同步更新 React Flow 内部 state 和父组件 state
      // 不通知父组件会导致父组件的 edges 还是空的，保存时丢失新连线
      setEdges((eds) => {
        const newEdges = addEdge({ ...connection, style: { stroke: '#94a3b8', strokeWidth: 2 } }, eds)
        onEdgesChange(newEdges)
        return newEdges
      })
    },
    [onEdgesChange, setEdges]
  )

  const onNodeClickWrapper = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick(node.id)
    },
    [onNodeClick]
  )

  const onPaneContextMenuWrapper = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      const screenPosition = { x: event.clientX, y: event.clientY }
      const flowPosition = reactFlowInstance.current
        ? reactFlowInstance.current.screenToFlowPosition(screenPosition)
        : screenPosition
      onPaneContextMenu(screenPosition, flowPosition)
    },
    [onPaneContextMenu]
  )

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeWrapper}
        onEdgesChange={onEdgesChangeWrapper}
        onConnect={onConnect}
        onNodeClick={onNodeClickWrapper}
        onPaneContextMenu={onPaneContextMenuWrapper}
        onInit={(instance) => (reactFlowInstance.current = instance)}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{ style: { stroke: '#94a3b8', strokeWidth: 2 } }}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Controls />
        <MiniMap />
        <Background gap={15} size={1} />
      </ReactFlow>
    </div>
  )
}
