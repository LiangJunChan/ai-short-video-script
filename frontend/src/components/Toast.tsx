interface ToastProps {
  message: string
}

function Toast({ message }: ToastProps) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
      <div className="bg-slate-900 text-white px-5 py-3 rounded-full shadow-lg text-sm font-medium flex items-center gap-2">
        <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {message}
      </div>
    </div>
  )
}

export default Toast
