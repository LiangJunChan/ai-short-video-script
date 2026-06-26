import { useState } from 'react'
import { videoApi } from '../../store/videoApi'

interface ChangePasswordFormProps {
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}

export default function ChangePasswordForm({ onSuccess, onError }: ChangePasswordFormProps) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [changePassword, { isLoading }] = videoApi.useChangePasswordMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      onError('新密码需要至少6个字符')
      return
    }
    if (newPassword !== confirmPassword) {
      onError('两次输入的密码不一致')
      return
    }
    if (oldPassword === newPassword) {
      onError('新密码不能与旧密码相同')
      return
    }

    try {
      const result = await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      }).unwrap()
      onSuccess(result.message || '密码修改成功')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      onError(err.data?.message || '密码修改失败')
    }
  }

  return (
    <div className="bg-av-bg-secondary rounded-xl border border-av-border-subtle p-6">
      <h2 className="text-lg font-semibold text-av-text-primary mb-4">修改密码</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-av-text-secondary mb-1">旧密码</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="input-field w-full px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-av-text-secondary mb-1">新密码</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input-field w-full px-3 py-2 text-sm"
            required
            minLength={6}
          />
        </div>
        <div>
          <label className="block text-sm text-av-text-secondary mb-1">确认新密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field w-full px-3 py-2 text-sm"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? '保存中...' : '保存修改'}
        </button>
      </form>
    </div>
  )
}
