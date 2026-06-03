package database

import (
	"database/sql"
	"time"
)

// Storyboard 画布模型
type Storyboard struct {
	ID           int        `json:"id"`
	UserID       int        `json:"userId"`
	VideoID      *int       `json:"videoId,omitempty"`
	Name         string     `json:"name"`
	Status       string     `json:"status"`
	ViewportJSON *string    `json:"viewportJson,omitempty"`
	Version      int        `json:"version"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

// CreateStoryboard 创建画布
func CreateStoryboard(userID int, name string, videoID *int) (int, error) {
	result, err := DB.Exec(`
		INSERT INTO storyboards (user_id, name, video_id)
		VALUES (?, ?, ?)
	`, userID, name, videoID)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	return int(id), err
}

// GetStoryboard 获取画布详情
func GetStoryboard(id int, userID int) (*Storyboard, error) {
	var s Storyboard
	err := DB.QueryRow(`
		SELECT id, user_id, video_id, name, status, viewport_json, version, created_at, updated_at
		FROM storyboards WHERE id = ? AND user_id = ?
	`, id, userID).Scan(
		&s.ID, &s.UserID, &s.VideoID, &s.Name, &s.Status,
		&s.ViewportJSON, &s.Version, &s.CreatedAt, &s.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// GetStoryboards 获取用户画布列表
func GetStoryboards(userID int, page, pageSize int) ([]Storyboard, int, error) {
	var total int
	err := DB.QueryRow("SELECT COUNT(*) FROM storyboards WHERE user_id = ?", userID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	rows, err := DB.Query(`
		SELECT id, user_id, video_id, name, status, viewport_json, version, created_at, updated_at
		FROM storyboards WHERE user_id = ?
		ORDER BY updated_at DESC
		LIMIT ? OFFSET ?
	`, userID, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var storyboards []Storyboard
	for rows.Next() {
		var s Storyboard
		if err := rows.Scan(
			&s.ID, &s.UserID, &s.VideoID, &s.Name, &s.Status,
			&s.ViewportJSON, &s.Version, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		storyboards = append(storyboards, s)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return storyboards, total, nil
}

// UpdateStoryboard 更新画布
func UpdateStoryboard(id int, userID int, name string, viewportJSON string) error {
	_, err := DB.Exec(`
		UPDATE storyboards SET name = ?, viewport_json = ?, updated_at = ?
		WHERE id = ? AND user_id = ?
	`, name, viewportJSON, time.Now(), id, userID)
	return err
}

// DeleteStoryboard 删除画布（级联删除节点和连线）
func DeleteStoryboard(id int, userID int) error {
	// 先删除连线（因为外键引用节点）
	DB.Exec("DELETE FROM storyboard_edges WHERE storyboard_id = ?", id)
	// 再删除节点
	DB.Exec("DELETE FROM storyboard_nodes WHERE storyboard_id = ?", id)
	// 最后删除画布
	_, err := DB.Exec("DELETE FROM storyboards WHERE id = ? AND user_id = ?", id, userID)
	return err
}
