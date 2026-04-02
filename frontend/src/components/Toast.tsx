interface ToastProps {
  message: string
}

function Toast({ message }: ToastProps) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-lg text-sm font-normal z-[2000] whitespace-nowrap animate-toast-in">
      {message}
    </div>
  )
}

export default Toast
