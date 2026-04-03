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
