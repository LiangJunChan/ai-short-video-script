interface ToastProps {
  message: string
}

function Toast({ message }: ToastProps) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-primary/90 backdrop-blur text-white px-6 py-3 rounded-lg text-sm font-medium z-[2000] whitespace-nowrap animate-toast-in shadow-lg">
      {message}
    </div>
  )
}

export default Toast
