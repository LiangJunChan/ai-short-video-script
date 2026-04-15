package model

import "time"

// APIResponse 统一响应格式
type APIResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// VideoListResponse 视频列表响应
type VideoListResponse struct {
	Videos     []VideoResponse `json:"videos"`
	Pagination PaginationInfo  `json:"pagination"`
}

// PaginationInfo 分页信息
type PaginationInfo struct {
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

// VideoResponse 视频详情响应
type VideoResponse struct {
	ID            int        `json:"id"`
	Title         string     `json:"title"`
	VideoUrl      string     `json:"videoUrl"`
	Thumbnail     *string    `json:"thumbnail"`
	Duration      float64    `json:"duration"`
	AIText        *string    `json:"aiText"`
	RewrittenText *string    `json:"rewrittenText"`
	RewriteStatus string     `json:"rewriteStatus"`
	Uploader      string     `json:"uploader"`
	CreatedAt     time.Time  `json:"createdAt"`
	Status        string     `json:"status"`
}
