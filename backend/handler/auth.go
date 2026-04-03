package handler

import (
	"database/sql"
	"net/http"
	"time"

	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

const dailyLoginBonus = 50

// Register 注册
func Register(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required,min=3,max=20"`
		Password string `json:"password" binding:"required,min=6,max=50"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "参数错误：用户名3-20字符，密码6-50字符",
		})
		return
	}

	// 检查用户是否已存在
	exists, err := database.UserExists(req.Username)
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
			Message: "用户名已存在",
		})
		return
	}

	// 密码哈希
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "密码加密失败",
		})
		return
	}

	// 创建用户（默认 normal 类型）
	_, err = database.CreateUser(req.Username, string(hash), "normal")
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "创建用户失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "注册成功",
	})
}

// Login 登录
func Login(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "请输入用户名和密码",
		})
		return
	}

	// 获取用户
	user, err := database.GetUserByUsername(req.Username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, APIResponse{
			Code:    401,
			Message: "用户名或密码错误",
		})
		return
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, APIResponse{
			Code:    401,
			Message: "用户名或密码错误",
		})
		return
	}

	// 处理每日登录积分（管理员除外）
	var creditsToAdd int
	if user.UserType != "admin" {
		now := time.Now()
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

		shouldBonus := true
		if user.LastLoginBonusAt != nil {
			lastDay := time.Date(
				user.LastLoginBonusAt.Year(),
				user.LastLoginBonusAt.Month(),
				user.LastLoginBonusAt.Day(),
				0, 0, 0, 0,
				user.LastLoginBonusAt.Location(),
			)
			if !lastDay.Before(today) {
				shouldBonus = false
			}
		}

		if shouldBonus {
			creditsToAdd = dailyLoginBonus
		}
	}

	// 更新登录状态并发放积分
	if creditsToAdd > 0 {
		database.WithTransaction(func(tx *sql.Tx) error {
			// 更新积分
			_, err := database.UpdateUserCredits(tx, user.ID, creditsToAdd)
			if err != nil {
				return err
			}
			// 设置登录奖励时间
			if err := database.SetLastLoginBonus(tx, user.ID, time.Now()); err != nil {
				return err
			}
			// 更新登录时间
			if err := database.SetLastLogin(tx, user.ID, time.Now()); err != nil {
				return err
			}
			return nil
		})
	} else {
		database.DB.Exec("UPDATE users SET last_login_at = ? WHERE id = ?", time.Now(), user.ID)
	}

	// 重新获取用户信息（包含更新后的积分）
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
			},
		},
	})
}

// GetMe 获取当前用户信息
func GetMe(c *gin.Context) {
	userId := middleware.GetUserID(c)

	user, err := database.GetUserByID(userId)
	if err != nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Code:    404,
			Message: "用户不存在",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data: gin.H{
			"id":        user.ID,
			"username":  user.Username,
			"user_type": user.UserType,
			"credits":   user.Credits,
		},
	})
}

// GetCredits 获取用户积分和日志
func GetCredits(c *gin.Context) {
	userId := middleware.GetUserID(c)

	credits, _, err := database.GetUserCredits(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取积分失败",
		})
		return
	}

	logs, err := database.GetCreditLogs(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取积分日志失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data: gin.H{
			"credits": credits,
			"logs":    logs,
		},
	})
}
