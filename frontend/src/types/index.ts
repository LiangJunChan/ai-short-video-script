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
