export interface Video {
  id: number
  title: string
  videoUrl: string
  thumbnail: string
  uploader: string
  aiText: string | null
  status: 'processing' | 'done' | 'failed'
  rewriteStatus?: 'idle' | 'rewriting' | 'done' | 'failed'
  rewrittenText?: string | null
  createdAt: string
  isOwner: boolean
  hasExtracted: boolean
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface VideoListResponse {
  code: number
  data: {
    videos: Video[]
    pagination: Pagination
  }
}

export interface VideoDetailResponse {
  code: number
  data: Video
}

export interface UploadResponse {
  code: number
  message: string
  data: Video
}

export interface ApiError {
  code: number
  message: string
}

// 用户类型
export interface User {
  id: number
  username: string
  user_type: 'normal' | 'vip' | 'admin'
  credits: number
}

// 登录响应
export interface LoginResponse {
  code: number
  message: string
  data: {
    token: string
    user: User
  }
}

// 当前用户响应
export interface MeResponse {
  code: number
  data: User
}

// 积分响应
export interface CreditLog {
  id: number
  userId: number
  action: string
  amount: number
  balanceAfter: number
  videoId?: number
  createdAt: string
}

export interface CreditsResponse {
  code: number
  data: {
    credits: number
    logs: CreditLog[]
  }
}

// 签到状态响应
export interface CheckinStatusResponse {
  code: number
  data: {
    checkedIn: boolean
    lastCheckinAt: string | null
  }
}

// 签到响应
export interface CheckinResponse {
  code: number
  message: string
  data: {
    credits: number
  }
}

// V1.6 收藏夹类型
export interface Collection {
  id: number
  userId: number
  name: string
  icon: string | null
  color: string | null
  description: string | null
  videoCount: number
  createdAt: string
  updatedAt: string
}

export interface CollectionListResponse {
  code: number
  message: string
  data: {
    collections: Collection[]
    pagination: Pagination
  }
}

export interface CollectionDetailResponse {
  code: number
  message: string
  data: {
    collection: Collection
    videos: Video[]
    pagination: Pagination
  }
}

// V1.6 标签类型
export interface Tag {
  id: number
  userId: number
  name: string
  usageCount: number
  createdAt: string
}

export interface TagListResponse {
  code: number
  message: string
  data: {
    tags: Tag[]
    pagination: Pagination
  }
}

export interface TagVideosResponse {
  code: number
  message: string
  data: {
    videos: Video[]
    pagination: Pagination
  }
}

// V1.6 搜索历史类型
export interface SearchHistory {
  id: number
  userId: number
  keyword: string
  createdAt: string
}

export interface SearchVideosParams {
  keyword?: string
  tagId?: number
  collectionId?: number
  sort?: string
  page?: number
  pageSize?: number
}

// 公开广场视频类型
export interface SquareVideo {
  id: number
  title: string
  thumbnailUrl: string
  username: string
  tags: string | null
  collectCount: number
  createdAt: string
}

export interface PublicVideosResponse {
  code: number
  message: string
  data: {
    videos: SquareVideo[]
    pagination: Pagination
  }
}

// V1.7 短视频广场收藏响应
export interface CollectSquareVideoResponse {
  code: number
  message: string
  data: {
    newVideoId: number
  }
}

// 模型配置类型
export interface ModelConfig {
  provider: string
  api_key: string
  api_base: string
  model: string
}

export interface ModelConfigsData {
  configs: {
    llm: ModelConfig | null
    image: ModelConfig | null
    tts: ModelConfig | null
    video: ModelConfig | null
  }
  global_defaults: {
    llm: Omit<ModelConfig, 'api_key'> | null
    image: Omit<ModelConfig, 'api_key'> | null
    tts: Omit<ModelConfig, 'api_key'> | null
    video: Omit<ModelConfig, 'api_key'> | null
  }
}

export interface ModelConfigsResponse {
  code: number
  message: string
  data: ModelConfigsData
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

export interface UpdateModelConfigRequest {
  provider: string
  api_key: string
  api_base: string
  model: string
}

// V2.0 画布类型
export interface Storyboard {
  id: number
  userId: number
  videoId?: number
  name: string
  status: string
  viewportJson?: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface StoryboardNode {
  id: number
  storyboardId: number
  nodeType: string
  positionX: number
  positionY: number
  width: number
  height: number
  configJson?: string
  state: string
  resultJson?: string
  orderIndex?: number
  createdAt: string
  updatedAt: string
}

export interface StoryboardEdge {
  id: number
  storyboardId: number
  sourceNodeId: number
  targetNodeId: number
  sourceHandle?: string
  targetHandle?: string
  label?: string
  createdAt: string
}

export interface StoryboardDetailResponse {
  code: number
  data: {
    storyboard: Storyboard
    nodes: StoryboardNode[]
    edges: StoryboardEdge[]
  }
}

export interface StoryboardListResponse {
  code: number
  data: {
    storyboards: Storyboard[]
    pagination: { page: number; pageSize: number; total: number }
  }
}

export interface SceneConfig {
  script?: string
  description?: string
  duration?: string
  imageUrl?: string
  shot_type?: string
  camera_move?: string
  notes?: string
  tags?: string[]
  label?: string
}
