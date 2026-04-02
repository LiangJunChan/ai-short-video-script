interface DeleteModalProps {
  title?: string
  message?: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
}

function DeleteModal({
  title = '确认删除',
  message = '此操作不可恢复，是否确定删除？',
  onConfirm,
  onCancel,
  confirmText = '删除',
  cancelText = '取消'
}: DeleteModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] flex items-center justify-center animate-overlay-in"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl p-8 w-[420px] max-w-[calc(100vw-48px)] animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <svg
            className="w-12 h-12 text-[#dc2626]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 className="text-xl font-normal text-center mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
          {title}
        </h3>
        <p className="text-sm text-[#666] text-center mb-6 font-light">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            className="flex-1 px-4 py-2.5 border border-[#e5e5e5] rounded-lg text-sm font-medium text-[#666] hover:border-[#999] transition-colors"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className="flex-1 px-4 py-2.5 bg-[#dc2626] text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteModal
