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
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">基本信息</h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">用户名</span>
          <span className="text-sm font-medium text-slate-900">{user.username}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">类型</span>
          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
            user.user_type === 'admin' ? 'bg-red-50 text-red-700' :
            user.user_type === 'vip' ? 'bg-amber-50 text-amber-700' :
            'bg-slate-50 text-slate-700'
          }`}>
            {typeLabels[user.user_type] || user.user_type}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">积分</span>
          <span className="text-sm font-medium text-sky-700">{user.credits}</span>
        </div>
      </div>
    </div>
  )
}
