import { useState, useEffect } from 'react'
import { ModelConfig } from '../../types'

interface ModelConfigCardProps {
  title: string
  icon: string
  configType: string
  config: ModelConfig | null
  globalDefault: { provider: string; api_base: string; model: string } | null
  providers: { value: string; label: string }[]
  isLoading: boolean
  onSave: (type: string, config: ModelConfig) => void
  onDelete: (type: string) => void
}

export default function ModelConfigCard({
  title,
  icon,
  configType,
  config,
  globalDefault,
  providers,
  isLoading,
  onSave,
  onDelete,
}: ModelConfigCardProps) {
  const [provider, setProvider] = useState(config?.provider || '')
  const [apiKey, setApiKey] = useState('')
  const [apiBase, setApiBase] = useState(config?.api_base || '')
  const [model, setModel] = useState(config?.model || '')

  useEffect(() => {
    if (config) {
      setProvider(config.provider)
      setApiBase(config.api_base)
      setModel(config.model)
      setApiKey('')
    } else {
      setProvider('')
      setApiKey('')
      setApiBase('')
      setModel('')
    }
  }, [config])

  const handleSave = () => {
    if (!provider || !apiKey || !apiBase || !model) return
    onSave(configType, { provider, api_key: apiKey, api_base: apiBase, model })
  }

  const hasConfig = config !== null

  return (
    <div className="border border-av-border-subtle rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-av-text-primary">
          {icon} {title}
        </h3>
        {hasConfig && (
          <span className="text-xs px-2 py-0.5 bg-av-state-success/10 text-av-state-success rounded-full">自定义</span>
        )}
      </div>

      {globalDefault && !hasConfig && (
        <p className="text-xs text-av-text-tertiary mb-3">
          当前使用全局默认：{globalDefault.provider} / {globalDefault.model}
        </p>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-av-text-secondary mb-1">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="input-field w-full px-3 py-1.5 text-sm"
          >
            <option value="">选择 Provider</option>
            {providers.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-av-text-secondary mb-1">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasConfig ? '已设置，留空保持不变' : '输入 API Key'}
            className="input-field w-full px-3 py-1.5 text-sm"
          />
          {hasConfig && config?.api_key && (
            <p className="text-xs text-av-text-tertiary mt-1">当前：{config.api_key}</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-av-text-secondary mb-1">API Base</label>
          <input
            type="text"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="https://api.example.com"
            className="input-field w-full px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-av-text-secondary mb-1">Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="模型名称"
            className="input-field w-full px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={isLoading || !provider || !apiBase || !model}
          className="btn-primary px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? '保存中...' : '保存'}
        </button>
        {hasConfig && (
          <button
            onClick={() => onDelete(configType)}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs text-av-text-secondary hover:text-av-state-error hover:bg-av-state-error/10 rounded-lg transition-colors"
          >
            恢复默认
          </button>
        )}
      </div>
    </div>
  )
}
