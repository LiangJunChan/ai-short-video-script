package database

import (
	"database/sql"
	"time"
)

// UserModelConfig 用户模型配置
type UserModelConfig struct {
	ID         int       `json:"id"`
	UserID     int       `json:"userId"`
	ConfigType string    `json:"configType"`
	Provider   string    `json:"provider"`
	ApiKey     string    `json:"apiKey"`
	ApiBase    string    `json:"apiBase"`
	Model      string    `json:"model"`
	ExtraJSON  string    `json:"extraJson,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// GetUserModelConfig 获取用户指定类型的模型配置
func GetUserModelConfig(userID int, configType string) (*UserModelConfig, error) {
	var c UserModelConfig
	err := DB.QueryRow(`
		SELECT id, user_id, config_type, provider, api_key, api_base, model, extra_json, created_at, updated_at
		FROM user_model_configs
		WHERE user_id = ? AND config_type = ?
	`, userID, configType).Scan(
		&c.ID, &c.UserID, &c.ConfigType, &c.Provider, &c.ApiKey,
		&c.ApiBase, &c.Model, &c.ExtraJSON, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// GetAllUserModelConfigs 获取用户所有模型配置
func GetAllUserModelConfigs(userID int) (map[string]*UserModelConfig, error) {
	rows, err := DB.Query(`
		SELECT id, user_id, config_type, provider, api_key, api_base, model, extra_json, created_at, updated_at
		FROM user_model_configs
		WHERE user_id = ?
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	configs := make(map[string]*UserModelConfig)
	for rows.Next() {
		var c UserModelConfig
		err := rows.Scan(
			&c.ID, &c.UserID, &c.ConfigType, &c.Provider, &c.ApiKey,
			&c.ApiBase, &c.Model, &c.ExtraJSON, &c.CreatedAt, &c.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		configs[c.ConfigType] = &c
	}
	return configs, nil
}

// UpsertUserModelConfig 创建或更新用户模型配置
func UpsertUserModelConfig(userID int, configType, provider, apiKey, apiBase, model string) error {
	_, err := DB.Exec(`
		INSERT INTO user_model_configs (user_id, config_type, provider, api_key, api_base, model, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(user_id, config_type) DO UPDATE SET
			provider = excluded.provider,
			api_key = excluded.api_key,
			api_base = excluded.api_base,
			model = excluded.model,
			updated_at = excluded.updated_at
	`, userID, configType, provider, apiKey, apiBase, model, time.Now())
	return err
}

// DeleteUserModelConfig 删除用户模型配置（恢复默认）
func DeleteUserModelConfig(userID int, configType string) error {
	_, err := DB.Exec(`
		DELETE FROM user_model_configs
		WHERE user_id = ? AND config_type = ?
	`, userID, configType)
	return err
}
