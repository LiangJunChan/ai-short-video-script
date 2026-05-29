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
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">
          {icon} {title}
        </h3>
        {hasConfig && (
          <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">自定义</span>
        )}
      </div>

      {globalDefault && !hasConfig && (
        <p className="text-xs text-slate-400 mb-3">
          当前使用全局默认：{globalDefault.provider} / {globalDefault.model}
        </p>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">选择 Provider</option>
            {providers.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasConfig ? '已设置，留空保持不变' : '输入 API Key'}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {hasConfig && config?.api_key && (
            <p className="text-xs text-slate-400 mt-1">当前：{config.api_key}</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">API Base</label>
          <input
            type="text"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="https://api.example.com"
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="模型名称"
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={isLoading || !provider || !apiBase || !model}
          className="px-3 py-1.5 bg-sky-500 text-white text-xs font-medium rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? '保存中...' : '保存'}
        </button>
        {hasConfig && (
          <button
            onClick={() => onDelete(configType)}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            恢复默认
          </button>
        )}
      </div>
    </div>
  )
}
