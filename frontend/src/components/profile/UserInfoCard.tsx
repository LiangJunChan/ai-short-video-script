import { User } from '../../types'

interface UserInfoCardProps {
  user: User
}

export default function UserInfoCard({ user }: UserInfoCardProps) {
  const typeLabels: Record<string, string> = {
    normal: '普通用户',
    vip: 'VIP 用户',
    admin: '管理员',
  }

  return (
    <div className="bg-av-bg-secondary rounded-xl border border-av-border-subtle p-6">
      <h2 className="text-lg font-semibold text-av-text-primary mb-4">基本信息</h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-av-text-secondary">用户名</span>
          <span className="text-sm font-medium text-av-text-primary">{user.username}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-av-text-secondary">类型</span>
          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
            user.user_type === 'admin' ? 'bg-av-state-error/10 text-av-state-error' :
            user.user_type === 'vip' ? 'bg-av-state-warning/10 text-av-state-warning' :
            'bg-av-bg-tertiary text-av-text-secondary'
          }`}>
            {typeLabels[user.user_type] || user.user_type}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-av-text-secondary">积分</span>
          <span className="text-sm font-medium text-primary">{user.credits}</span>
        </div>
      </div>
    </div>
  )
}
