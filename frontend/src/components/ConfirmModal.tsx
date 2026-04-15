interface ConfirmModalProps {
  title?: string
  message?: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  isConfirming?: boolean
  variant?: 'danger' | 'default'
}

function ConfirmModal({
  title = '确认操作',
  message = '确定要执行此操作吗？',
  onConfirm,
  onCancel,
  confirmText = '确定',
  cancelText = '取消',
  isConfirming = false,
  variant = 'default'
}: ConfirmModalProps) {
  const isDanger = variant === 'danger'

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center ${
          isDanger ? 'bg-red-50' : 'bg-sky-50'
        }`}>
          {isDanger ? (
            <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg className="w-6 h-6 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01" strokeLinecap="round"/>
            </svg>
          )}
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-center text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-center text-slate-500 mb-6">{message}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="flex-1 btn-secondary py-2.5 text-sm disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm ${
              isDanger
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isConfirming ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal