package handler

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"regexp"
	"time"

	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"
	"ai-short-video-backend/service"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// SendCode 发送邮箱验证码
// POST /api/auth/send-code
func SendCode(c *gin.Context) {
	var req struct {
		Email   string `json:"email" binding:"required"`
		Purpose string `json:"purpose" binding:"required"` // register, login, reset_password
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "参数错误：邮箱和用途为必填",
		})
		return
	}

	// 验证邮箱格式
	if !isValidEmail(req.Email) {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "邮箱格式不正确",
		})
		return
	}

	// 验证用途
	if req.Purpose != "register" && req.Purpose != "reset_password" {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "用途无效，支持：register, reset_password",
		})
		return
	}

	// 检查发送频率（60秒间隔）
	err := database.CheckSendFrequency(req.Email, req.Purpose)
	if err != nil {
		if err == database.ErrCodeTooFrequent {
			c.JSON(http.StatusTooManyRequests, APIResponse{
				Code:    429,
				Message: "发送验证码太频繁，请60秒后再试",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "服务器错误",
		})
		return
	}

	// 注册时检查邮箱是否已存在
	if req.Purpose == "register" {
		exists, err := database.EmailExists(req.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    500,
				Message: "服务器错误",
			})
			return
		}
		if exists {
			c.JSON(http.StatusConflict, APIResponse{
				Code:    409,
				Message: "该邮箱已注册",
			})
			return
		}
	}

	// 重置密码时检查邮箱是否已注册
	if req.Purpose == "reset_password" {
		exists, err := database.EmailExists(req.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    500,
				Message: "服务器错误",
			})
			return
		}
		if !exists {
			c.JSON(http.StatusNotFound, APIResponse{
				Code:    404,
				Message: "该邮箱未注册",
			})
			return
		}
	}

	// 生成6位数字验证码
	code := generateCode()

	// 保存验证码
	err = database.SaveEmailCode(req.Email, code, req.Purpose)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "保存验证码失败",
		})
		return
	}

	// 发送验证码邮件
	err = service.SendVerificationCode(req.Email, code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "发送验证码失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "验证码已发送",
	})
}

// RegisterByEmail 邮箱注册
// POST /api/auth/register-by-email
func RegisterByEmail(c *gin.Context) {
	// 注册开关：默认开启，SIGN_UP=false 时关闭
	if os.Getenv("SIGN_UP") == "false" {
		c.JSON(http.StatusForbidden, APIResponse{
			Code:    403,
			Message: "注册功能已关闭",
		})
		return
	}

	var req struct {
		Email    string `json:"email" binding:"required"`
		Code     string `json:"code" binding:"required"`
		Password string `json:"password" binding:"required,min=6,max=50"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "参数错误：邮箱、验证码和密码为必填（密码6-50字符）",
		})
		return
	}

	// 验证邮箱格式
	if !isValidEmail(req.Email) {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "邮箱格式不正确",
		})
		return
	}

	// 验证验证码
	user, err := verifyCodeAndProceed(req.Email, req.Code, "register", func(ec *database.EmailCode) (*database.User, error) {
		// 从邮箱生成用户名
		username, err := database.GenerateUsernameFromEmail(req.Email)
		if err != nil {
			return nil, err
		}

		// 密码哈希
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
		if err != nil {
			return nil, err
		}

		// 创建带邮箱的用户
		userId, err := database.CreateUserWithEmail(username, string(hash), "normal", req.Email)
		if err != nil {
			return nil, err
		}

		// 给新用户赠送初始积分
		_, err = database.DB.Exec("UPDATE users SET credits = 30 WHERE id = ?", userId)
		if err != nil {
			return nil, err
		}

		// 获取创建的用户
		return database.GetUserByID(userId)
	})

	if err != nil {
		handleVerifyError(c, err)
		return
	}

	// 生成 JWT
	token, err := middleware.GenerateToken(user.ID, user.Username, user.UserType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "生成Token失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "注册成功",
		Data: gin.H{
			"token": token,
			"user": gin.H{
				"id":        user.ID,
				"username":  user.Username,
				"user_type": user.UserType,
				"credits":   user.Credits,
				"email":     user.Email,
			},
		},
	})
}

// LoginByEmail 邮箱密码登录（不需要验证码）
// POST /api/auth/login-by-email
func LoginByEmail(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "参数错误：邮箱和密码为必填",
		})
		return
	}

	// 验证邮箱格式
	if !isValidEmail(req.Email) {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "邮箱格式不正确",
		})
		return
	}

	// 通过邮箱查找用户
	user, err := database.GetUserByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "邮箱或密码错误",
		})
		return
	}

	if user == nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "邮箱或密码错误",
		})
		return
	}

	// 验证密码
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "邮箱或密码错误",
		})
		return
	}

	// 更新最后登录时间
	database.DB.Exec("UPDATE users SET last_login_at = ? WHERE id = ?", time.Now(), user.ID)

	// 重新获取用户信息
	user, _ = database.GetUserByID(user.ID)

	// 生成 JWT
	token, err := middleware.GenerateToken(user.ID, user.Username, user.UserType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "生成Token失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "登录成功",
		Data: gin.H{
			"token": token,
			"user": gin.H{
				"id":        user.ID,
				"username":  user.Username,
				"user_type": user.UserType,
				"credits":   user.Credits,
				"email":     user.Email,
			},
		},
	})
}

// ResetPassword 邮箱重置密码
// POST /api/auth/reset-password
func ResetPassword(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required"`
		Code     string `json:"code" binding:"required"`
		Password string `json:"password" binding:"required,min=6,max=50"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "参数错误：邮箱、验证码和新密码为必填（密码6-50字符）",
		})
		return
	}

	// 验证邮箱格式
	if !isValidEmail(req.Email) {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "邮箱格式不正确",
		})
		return
	}

	// 验证验证码并重置密码
	_, err := verifyCodeAndProceed(req.Email, req.Code, "reset_password", func(ec *database.EmailCode) (*database.User, error) {
		// 获取用户
		user, err := database.GetUserByEmail(req.Email)
		if err != nil {
			return nil, err
		}

		// 加密新密码
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
		if err != nil {
			return nil, err
		}

		// 更新密码
		err = database.UpdatePassword(user.ID, string(hash))
		if err != nil {
			return nil, err
		}

		return user, nil
	})

	if err != nil {
		handleVerifyError(c, err)
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "密码重置成功",
	})
}

// verifyCodeAndProceed 验证验证码并执行后续操作
func verifyCodeAndProceed(email, code, purpose string, fn func(*database.EmailCode) (*database.User, error)) (*database.User, error) {
	log.Printf("[验证码验证] email=%s, code=%s, purpose=%s", email, code, purpose)
	// 查询验证码
	emailCode, err := database.GetEmailCode(email, code, purpose)
	if err != nil {
		log.Printf("[验证码验证] 查询失败: %v", err)
		return nil, err
	}
	log.Printf("[验证码验证] 找到验证码: id=%d, code=%s, expires=%v", emailCode.ID, emailCode.Code, emailCode.ExpiresAt)

	// 检查是否已过期
	if time.Now().After(emailCode.ExpiresAt) {
		database.DeleteUsedCode(emailCode.ID)
		return nil, database.ErrCodeExpired
	}

	// 检查是否被锁定
	if emailCode.LockedUntil != nil && time.Now().Before(*emailCode.LockedUntil) {
		return nil, database.ErrCodeLocked
	}

	// 验证码正确，删除已使用的验证码
	err = database.DeleteUsedCode(emailCode.ID)
	if err != nil {
		return nil, err
	}

	// 执行后续操作
	return fn(emailCode)
}

// handleVerifyError 处理验证码相关的错误
func handleVerifyError(c *gin.Context, err error) {
	switch err {
	case database.ErrCodeNotFound:
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "验证码错误",
		})
	case database.ErrCodeExpired:
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "验证码已过期，请重新获取",
		})
	case database.ErrCodeLocked:
		c.JSON(http.StatusTooManyRequests, APIResponse{
			Code:    429,
			Message: "验证码错误次数过多，请10分钟后再试",
		})
	case database.ErrCodeTooFrequent:
		c.JSON(http.StatusTooManyRequests, APIResponse{
			Code:    429,
			Message: "操作太频繁，请稍后再试",
		})
	default:
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "服务器错误",
		})
	}
}

// generateCode 生成6位数字验证码
func generateCode() string {
	rand.Seed(time.Now().UnixNano())
	code := rand.Intn(1000000)
	return fmt.Sprintf("%06d", code)
}

// isValidEmail 验证邮箱格式
func isValidEmail(email string) bool {
	pattern := `^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`
	matched, _ := regexp.MatchString(pattern, email)
	return matched
}
