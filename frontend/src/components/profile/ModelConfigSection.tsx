import { videoApi } from '../../store/videoApi'
import { ModelConfig } from '../../types'
import ModelConfigCard from './ModelConfigCard'

interface ModelConfigSectionProps {
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}

const LLM_PROVIDERS = [
  { value: 'minimax', label: 'MiniMax' },
  { value: 'volcano', label: '火山方舟' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'custom', label: '自定义' },
]

const IMAGE_PROVIDERS = [
  { value: 'flux', label: 'Flux' },
  { value: 'dalle', label: 'DALL-E' },
  { value: 'midjourney', label: 'Midjourney' },
  { value: 'custom', label: '自定义' },
]

const TTS_PROVIDERS = [
  { value: 'volcano', label: '火山引擎 TTS' },
  { value: 'edge', label: 'Edge TTS' },
  { value: 'minimax', label: 'MiniMax TTS' },
  { value: 'custom', label: '自定义' },
]

const VIDEO_PROVIDERS = [
  { value: 'kling', label: '可灵' },
  { value: 'runway', label: 'Runway' },
  { value: 'pika', label: 'Pika' },
  { value: 'custom', label: '自定义' },
]

export default function ModelConfigSection({ onSuccess, onError }: ModelConfigSectionProps) {
  const { data: configsData, isLoading } = videoApi.useGetModelConfigsQuery()
  const [updateConfig, { isLoading: isUpdating }] = videoApi.useUpdateModelConfigMutation()
  const [deleteConfig] = videoApi.useDeleteModelConfigMutation()

  const configs = configsData?.data?.configs
  const defaults = configsData?.data?.global_defaults

  const handleSave = async (type: string, config: ModelConfig) => {
    try {
      await updateConfig({ type, ...config }).unwrap()
      onSuccess('配置保存成功')
    } catch (err: any) {
      onError(err.data?.message || '保存失败')
    }
  }

  const handleDelete = async (type: string) => {
    try {
      await deleteConfig(type).unwrap()
      onSuccess('已恢复默认配置')
    } catch (err: any) {
      onError(err.data?.message || '操作失败')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">模型配置</h2>
        <p className="text-sm text-slate-400">加载中...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-2">模型配置</h2>
      <p className="text-xs text-slate-400 mb-4">
        自定义你的 AI 模型配置。未配置的用途将使用全局默认设置。
      </p>
      <div className="space-y-4">
        <ModelConfigCard
          title="LLM 文案生成"
          icon="📝"
          configType="llm"
          config={configs?.llm ?? null}
          globalDefault={defaults?.llm ?? null}
          providers={LLM_PROVIDERS}
          isLoading={isUpdating}
          onSave={handleSave}
          onDelete={handleDelete}
        />
        <ModelConfigCard
          title="AI 图片生成"
          icon="🖼️"
          configType="image"
          config={configs?.image ?? null}
          globalDefault={defaults?.image ?? null}
          providers={IMAGE_PROVIDERS}
          isLoading={isUpdating}
          onSave={handleSave}
          onDelete={handleDelete}
        />
        <ModelConfigCard
          title="TTS 语音合成"
          icon="🎙️"
          configType="tts"
          config={configs?.tts ?? null}
          globalDefault={defaults?.tts ?? null}
          providers={TTS_PROVIDERS}
          isLoading={isUpdating}
          onSave={handleSave}
          onDelete={handleDelete}
        />
        <ModelConfigCard
          title="AI 视频生成"
          icon="🎬"
          configType="video"
          config={configs?.video ?? null}
          globalDefault={defaults?.video ?? null}
          providers={VIDEO_PROVIDERS}
          isLoading={isUpdating}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}
