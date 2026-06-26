interface ConfirmModalProps {
  title?: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  confirmButtonType?: 'danger' | 'primary'
}

function ConfirmModal({
  title = '确认操作',
  message,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
  isLoading = false,
  confirmButtonType = 'primary',
}: ConfirmModalProps) {
  const confirmButtonClass = confirmButtonType === 'danger'
    ? 'bg-av-state-error text-white hover:bg-av-state-error/90 shadow-av-sm'
    : 'btn-gradient-primary text-av-text-inverse'

  const iconColor = confirmButtonType === 'danger' ? 'text-av-state-error' : 'text-primary'
  const bgColor = confirmButtonType === 'danger' ? 'bg-av-state-error/10' : 'bg-primary/10'

  return (
    <div
      className="fixed inset-0 bg-[rgba(8,9,13,0.7)] backdrop-blur-sm z-av-modal flex items-center justify-center animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="surface neon-border rounded-xl p-6 w-full max-w-sm mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`w-12 h-12 mx-auto mb-4 rounded-xl ${bgColor} flex items-center justify-center`}>
          <svg className={`w-6 h-6 ${iconColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {confirmButtonType === 'danger' ? (
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round"/>
            ) : (
              <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-center text-av-text-primary mb-2">{title}</h3>
        <p className="text-sm text-center text-av-text-secondary mb-6 whitespace-pre-line">{message}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 btn-secondary py-2.5 text-sm disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all disabled:opacity-50 ${confirmButtonClass}`}
          >
            {isLoading ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
