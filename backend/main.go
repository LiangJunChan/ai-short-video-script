package main

import (
	"ai-short-video-backend/database"
	"ai-short-video-backend/handler"
	"ai-short-video-backend/service"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	// 初始化数据库
	database.InitDB()

	// 确保上传目录存在
	uploadDirs := []string{"../uploads", "../thumbnails", "../audio"}
	for _, dir := range uploadDirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Printf("Warning: failed to create directory %s: %v", dir, err)
		}
	}

	// 初始化服务
	service.InitFFmpeg()

	// 创建Gin实例
	r := gin.Default()

	// CORS配置
	r.Use(corsMiddleware())

	// 静态文件服务
	r.Static("/uploads", "../uploads")
	r.Static("/thumbnails", "../thumbnails")
	r.Static("/video", "../uploads")

	// API路由
	api := r.Group("/api")
	{
		api.GET("/videos", handler.GetVideoList)
		api.GET("/videos/:id", handler.GetVideoDetail)
		api.POST("/upload", handler.UploadVideo)
		api.GET("/videos/:id/copy", handler.GetVideoText)
	}

	// 启动服务器
	log.Printf("后端服务已启动，访问地址: http://localhost:3000")
	log.Printf("API端点:")
	log.Printf("  GET  /api/videos - 获取视频列表")
	log.Printf("  GET  /api/videos/:id - 获取视频详情")
	log.Printf("  POST /api/upload - 上传视频")
	log.Printf("  GET  /api/videos/:id/copy - 获取文案用于复制")

	if err := r.Run(":3000"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
