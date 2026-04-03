package middleware

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// APIResponse 通用响应
type APIResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

var jwtSecret = os.Getenv("JWT_SECRET")
var jwtSecretBytes []byte

func init() {
	if jwtSecret == "" {
		jwtSecret = "default-secret-key-change-in-production-min32chars"
	}
	jwtSecretBytes = []byte(jwtSecret)
}

// Claims JWT claims
type Claims struct {
	UserId   int    `json:"user_id"`
	Username string `json:"username"`
	UserType string `json:"user_type"`
	jwt.RegisteredClaims
}

// GenerateToken 生成JWT token
func GenerateToken(userId int, username, userType string) (string, error) {
	claims := Claims{
		UserId:   userId,
		Username: username,
		UserType: userType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecretBytes)
}

// AuthMiddleware 认证中间件
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, APIResponse{
				Code:    401,
				Message: "请先登录",
			})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, APIResponse{
				Code:    401,
				Message: "Token格式错误",
			})
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return jwtSecretBytes, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, APIResponse{
				Code:    401,
				Message: "Token无效或已过期",
			})
			c.Abort()
			return
		}

		// 将用户信息注入 Context
		c.Set("user_id", claims.UserId)
		c.Set("username", claims.Username)
		c.Set("user_type", claims.UserType)

		c.Next()
	}
}

// GetUserID 从 Context 获取用户ID
func GetUserID(c *gin.Context) int {
	if id, exists := c.Get("user_id"); exists {
		return id.(int)
	}
	return 0
}

// GetUsername 从 Context 获取用户名
func GetUsername(c *gin.Context) string {
	if username, exists := c.Get("username"); exists {
		return username.(string)
	}
	return ""
}

// GetUserType 从 Context 获取用户类型
func GetUserType(c *gin.Context) string {
	if userType, exists := c.Get("user_type"); exists {
		return userType.(string)
	}
	return ""
}

// IsAdmin 检查是否为管理员
func IsAdmin(c *gin.Context) bool {
	return GetUserType(c) == "admin"
}
