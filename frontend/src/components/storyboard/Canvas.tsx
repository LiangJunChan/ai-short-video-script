import { useCallback, useRef, useEffect } from 'react'
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

const nodeTypes = { scene: SceneNode, start: SceneNode, end: SceneNode }

interface CanvasProps {
  initialNodes: Node[]
  initialEdges: Edge[]
  onNodesChange: (nodes: Node[]) => void
  onEdgesChange: (edges: Edge[]) => void
  onNodeClick: (nodeId: string) => void
  onPaneDoubleClick: (position: { x: number; y: number }) => void
  fitViewKey?: number
}

export default function Canvas({
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onPaneDoubleClick,
  fitViewKey,
}: CanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, handleNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, handleEdgesChange] = useEdgesState(initialEdges)
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)

  // Sync initial data when it changes
  useEffect(() => {
    setNodes(initialNodes)
    // Fit view after nodes update (e.g., after AI split)
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
      setTimeout(() => {
        setNodes((nds) => {
          onNodesChange(nds)
          return nds
        })
      }, 100)
    },
    [handleNodesChange, onNodesChange, setNodes]
  )

  const onEdgesChangeWrapper = useCallback(
    (changes: EdgeChange[]) => {
      handleEdgesChange(changes)
      setTimeout(() => {
        setEdges((eds) => {
          onEdgesChange(eds)
          return eds
        })
      }, 100)
    },
    [handleEdgesChange, onEdgesChange, setEdges]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds))
    },
    [setEdges]
  )

  const onNodeClickWrapper = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick(node.id)
    },
    [onNodeClick]
  )

  const lastPaneClickTime = useRef<number>(0)

  const onPaneClickWrapper = useCallback(
    (event: React.MouseEvent) => {
      const now = Date.now()
      if (now - lastPaneClickTime.current < 300) {
        // Double click detected
        if (reactFlowInstance.current) {
          const position = reactFlowInstance.current.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          })
          onPaneDoubleClick(position)
        }
        lastPaneClickTime.current = 0
      } else {
        lastPaneClickTime.current = now
      }
    },
    [onPaneDoubleClick]
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
        onPaneClick={onPaneClickWrapper}
        onInit={(instance) => (reactFlowInstance.current = instance)}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{ animated: true }}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Controls />
        <MiniMap />
        <Background gap={15} size={1} />
      </ReactFlow>
    </div>
  )
}
