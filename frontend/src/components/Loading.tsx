function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="flex gap-2">
        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-neutral-500 font-light">加载中</span>
    </div>
  )
}

export default Loading
