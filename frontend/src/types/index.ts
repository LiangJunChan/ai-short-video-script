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
