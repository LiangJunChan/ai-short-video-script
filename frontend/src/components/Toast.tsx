interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
}

const typeColors: Record<NonNullable<ToastProps['type']>, { border: string; dot: string }> = {
  success: { border: 'var(--color-primary)', dot: 'var(--color-primary)' },
  error: { border: 'var(--state-error)', dot: 'var(--state-error)' },
  warning: { border: 'var(--state-warning)', dot: 'var(--state-warning)' },
  info: { border: 'var(--state-info)', dot: 'var(--state-info)' },
}

function Toast({ message, type = 'info' }: ToastProps) {
  const colors = typeColors[type]

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-av-toast animate-slide-down">
      <div
        className="rounded-lg px-4 py-3 flex items-center gap-3 min-w-[260px] max-w-[420px] shadow-av-lg"
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          borderLeft: `3px solid ${colors.border}`,
        }}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: colors.dot }}
        />
        <p className="text-sm font-medium flex-1" style={{ color: 'var(--color-text-primary)' }}>
          {message}
        </p>
      </div>
    </div>
  )
}

export default Toast
