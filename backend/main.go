package main

import (
	"ai-short-video-backend/database"
	"ai-short-video-backend/handler"
	"ai-short-video-backend/middleware"
	"ai-short-video-backend/service"
	"bufio"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
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

	// 初始化管理员账号
	initAdmin()

	// API路由（公开）
	api := r.Group("/api")
	{
		api.POST("/auth/register", handler.Register)
		api.POST("/auth/login", handler.Login)
	}

	// 受保护的API路由
	auth := r.Group("/api")
	auth.Use(middleware.AuthMiddleware())
	{
		auth.GET("/auth/me", handler.GetMe)
		auth.GET("/user/credits", handler.GetCredits)
		auth.GET("/user/checkin", handler.CheckinStatus)
		auth.POST("/user/checkin", handler.DoCheckin)
		auth.GET("/videos", handler.GetVideoList)
		auth.GET("/videos/:id", handler.GetVideoDetail)
		auth.POST("/upload", handler.UploadVideo)
		auth.GET("/videos/:id/copy", handler.GetVideoText)
		auth.POST("/videos/:id/reextract", handler.ReextractVideo)
		auth.POST("/videos/:id/rewrite", handler.RewriteVideoText)
		auth.POST("/video/extract-by-url", handler.ExtractVideoByURL)
		auth.DELETE("/videos/:id", handler.DeleteVideo)
	}

	// 启动服务器
	log.Printf("后端服务已启动，访问地址: http://localhost:3000")
	log.Printf("API端点:")
	log.Printf("  POST /api/auth/register - 用户注册")
	log.Printf("  POST /api/auth/login - 用户登录")
	log.Printf("  GET  /api/auth/me - 当前用户信息")
	log.Printf("  GET  /api/user/credits - 用户积分")
	log.Printf("  GET  /api/user/checkin - 获取签到状态")
	log.Printf("  POST /api/user/checkin - 执行签到")
	log.Printf("  GET  /api/videos - 获取视频列表")
	log.Printf("  GET  /api/videos/:id - 获取视频详情")
	log.Printf("  POST /api/upload - 上传视频")
	log.Printf("  GET  /api/videos/:id/copy - 获取文案用于复制")
	log.Printf("  POST /api/videos/:id/reextract - 重新提取文案")
	log.Printf("  POST /api/videos/:id/rewrite - AI改写文案")
	log.Printf("  POST /api/video/extract-by-url - 链接提取视频文案")

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

// initAdmin 初始化管理员账号
func initAdmin() {
	exists, err := database.UserExists("luka")
	if err != nil {
		log.Printf("Warning: failed to check admin existence: %v", err)
		return
	}
	if exists {
		log.Println("Admin user 'luka' already exists")
		return
	}

	// 创建管理员账号，密码为 123456
	hash, err := bcrypt.GenerateFromPassword([]byte("123456"), 12)
	if err != nil {
		log.Printf("Warning: failed to hash admin password: %v", err)
		return
	}

	_, err = database.CreateUser("luka", string(hash), "admin")
	if err != nil {
		log.Printf("Warning: failed to create admin user: %v", err)
		return
	}

	log.Println("Admin user 'luka' created with password '123456'")
}
