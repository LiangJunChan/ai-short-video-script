import { memo } from 'react'

interface UnsavedBadgeProps {
  show: boolean
}

const UnsavedBadge = memo(({ show }: UnsavedBadgeProps) => {
  if (!show) return null
  return (
    <div
      className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-medium text-white bg-av-state-error rounded-full border-2 border-av-bg-primary shadow-av-sm"
      title="该节点尚未保存到服务器"
    >
      未保存
    </div>
  )
})

UnsavedBadge.displayName = 'UnsavedBadge'
export default UnsavedBadge
