import { useOutletContext } from 'react-router-dom'
import VideoList from './components/VideoList'

interface LayoutContext {
  onOpenUpload: () => void
}

function App() {
  const { onOpenUpload } = useOutletContext<LayoutContext>()

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-8">
      <VideoList onUpload={onOpenUpload} />
    </main>
  )
}

export default App
