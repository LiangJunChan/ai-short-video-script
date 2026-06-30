package handler

import (
	"fmt"
	"net/http"

	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"
	"ai-short-video-backend/service"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// validConfigTypes 定义合法的模型配置类型
var validConfigTypes = map[string]bool{
	"llm":   true,
	"image": true,
	"tts":   true,
	"video": true,
}

// ChangePassword 修改密码
func ChangePassword(c *gin.Context) {
	userId := middleware.GetUserID(c)

	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6,max=50"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "参数错误：请输入旧密码和新密码（6-50字符）",
		})
		return
	}

	// 获取用户信息
	user, err := database.GetUserByID(userId)
	if err != nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Code:    404,
			Message: "用户不存在",
		})
		return
	}

	// 验证旧密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, APIResponse{
			Code:    401,
			Message: "旧密码错误",
		})
		return
	}

	// 检查新密码是否与旧密码相同
	if req.OldPassword == req.NewPassword {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "新密码不能与旧密码相同",
		})
		return
	}

	// 加密新密码
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "密码加密失败",
		})
		return
	}

	// 更新密码
	_, err = database.DB.Exec("UPDATE users SET password_hash = ? WHERE id = ?", string(hash), userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "修改密码失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "密码修改成功",
	})
}

// GetModelConfigs 获取用户模型配置
func GetModelConfigs(c *gin.Context) {
	userId := middleware.GetUserID(c)
	userType := middleware.GetUserType(c)

	// 仅 admin/vip 可访问
	if userType != "admin" && userType != "vip" {
		c.JSON(http.StatusForbidden, APIResponse{
			Code:    403,
			Message: "仅 VIP/管理员 可以管理模型配置",
		})
		return
	}

	// 获取用户所有配置
	configs, err := database.GetAllUserModelConfigs(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取模型配置失败",
		})
		return
	}

	// 对 API key 进行脱敏处理，同时转换为 service.ModelConfig 格式
	maskedConfigs := make(map[string]interface{})
	for configType, cfg := range configs {
		maskedConfigs[configType] = gin.H{
			"provider": cfg.Provider,
			"apiKey":   maskApiKey(cfg.ApiKey),
			"apiBase":  cfg.ApiBase,
			"model":    cfg.Model,
		}
	}

	// 获取全局默认配置
	globalDefaults, err := service.GetGlobalDefaultConfigs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取全局默认配置失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data: gin.H{
			"configs":         maskedConfigs,
			"global_defaults": globalDefaults,
		},
	})
}

// UpdateModelConfig 更新/创建模型配置
func UpdateModelConfig(c *gin.Context) {
	userId := middleware.GetUserID(c)
	userType := middleware.GetUserType(c)
	configType := c.Param("type")

	// 仅 admin/vip 可访问
	if userType != "admin" && userType != "vip" {
		c.JSON(http.StatusForbidden, APIResponse{
			Code:    403,
			Message: "仅 VIP/管理员 可以管理模型配置",
		})
		return
	}

	// 校验配置类型
	if !validConfigTypes[configType] {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的配置类型，支持：llm, image, tts, video",
		})
		return
	}

	var req struct {
		Provider string `json:"provider" binding:"required"`
		ApiKey   string `json:"api_key" binding:"required"`
		ApiBase  string `json:"api_base" binding:"required"`
		Model    string `json:"model" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "参数错误：provider, api_key, api_base, model 均为必填",
		})
		return
	}

	// 保存配置
	err := database.UpsertUserModelConfig(userId, configType, req.Provider, req.ApiKey, req.ApiBase, req.Model, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "保存模型配置失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "保存成功",
	})
}

// DeleteModelConfig 删除模型配置
func DeleteModelConfig(c *gin.Context) {
	userId := middleware.GetUserID(c)
	userType := middleware.GetUserType(c)
	configType := c.Param("type")

	// 仅 admin/vip 可访问
	if userType != "admin" && userType != "vip" {
		c.JSON(http.StatusForbidden, APIResponse{
			Code:    403,
			Message: "仅 VIP/管理员 可以管理模型配置",
		})
		return
	}

	// 校验配置类型
	if !validConfigTypes[configType] {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的配置类型，支持：llm, image, tts, video",
		})
		return
	}

	err := database.DeleteUserModelConfig(userId, configType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "删除模型配置失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "删除成功",
	})
}

// maskApiKey 对 API key 进行脱敏，只显示最后 4 个字符
func maskApiKey(key string) string {
	if len(key) <= 4 {
		return "***"
	}
	return fmt.Sprintf("***%s", key[len(key)-4:])
}

