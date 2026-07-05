import { useState, useCallback, useRef } from 'react'

/**
 * 全局 Toast hook — 统一替代各页面散落的 toast 状态管理
 * 用法：
 *   const toast = useToast()
 *   toast.show('操作成功')
 */
export function useToast() {
  const [toast, setToast] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((message: string, duration = 3000) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    setToast(message)
    timerRef.current = setTimeout(() => {
      setToast(null)
      timerRef.current = null
    }, duration)
  }, [])

  return { toast, show }
}
