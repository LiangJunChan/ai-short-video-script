package main

import (
	"ai-short-video-backend/database"
	"ai-short-video-backend/handler"
	"ai-short-video-backend/service"
	"bufio"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func main() {
	// 加载 .env 文件
	loadEnvFile()

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
		api.POST("/videos/:id/reextract", handler.ReextractVideo)
		api.POST("/videos/:id/rewrite", handler.RewriteVideoText)
		api.DELETE("/videos/:id", handler.DeleteVideo)
	}

	// 启动服务器
	log.Printf("后端服务已启动，访问地址: http://localhost:3000")
	log.Printf("API端点:")
	log.Printf("  GET  /api/videos - 获取视频列表")
	log.Printf("  GET  /api/videos/:id - 获取视频详情")
	log.Printf("  POST /api/upload - 上传视频")
	log.Printf("  GET  /api/videos/:id/copy - 获取文案用于复制")
	log.Printf("  POST /api/videos/:id/reextract - 重新提取文案")
	log.Printf("  POST /api/videos/:id/rewrite - AI改写文案")

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

// loadEnvFile 读取 .env 文件并设置环境变量
func loadEnvFile() {
	file, err := os.Open(".env")
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		// 跳过空行和注释
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		// 解析 KEY=VALUE 格式
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			if key != "" && os.Getenv(key) == "" {
				os.Setenv(key, value)
			}
		}
	}
}
