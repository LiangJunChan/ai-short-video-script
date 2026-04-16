package database

import (
	"time"
)

// SquareVideo 广场视频列表项
type SquareVideo struct {
	ID           int       `json:"id"`
	Title        string    `json:"title"`
	ThumbnailURL string    `json:"thumbnailUrl"`
	Username     string    `json:"username"`
	Tags         *string   `json:"tags"`
	CollectCount int       `json:"collectCount"`
	CreatedAt    time.Time `json:"createdAt"`
}

// GetPublicVideos 获取公开视频列表（分页）
func GetPublicVideos(page, pageSize int, sortBy string) ([]SquareVideo, int, error) {
	// sortBy: "newest" 按时间倒序 / "popular" 按收藏数倒序
	offset := (page - 1) * pageSize

	query := `
		SELECT 
			v.id, 
			v.title, 
			v.thumbnail_url, 
			u.username, 
			v.ai_tags, 
			v.collect_count,
			v.created_at
		FROM videos v
		JOIN users u ON v.user_id = u.id
		WHERE u.allow_public_square = 1
		AND v.status = 'done'
	`

	var orderClause string
	switch sortBy {
	case "popular":
		orderClause = " ORDER BY v.collect_count DESC, v.created_at DESC"
	default: // newest
		orderClause = " ORDER BY v.created_at DESC"
	}

	rows, err := DB.Query(query + orderClause + " LIMIT ? OFFSET ?", pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var videos []SquareVideo
	for rows.Next() {
		var v SquareVideo
		err := rows.Scan(
			&v.ID,
			&v.Title,
			&v.ThumbnailURL,
			&v.Username,
			&v.Tags,
			&v.CollectCount,
			&v.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		videos = append(videos, v)
	}

	// Get total count
	var total int
	err = DB.QueryRow(`
		SELECT COUNT(*)
		FROM videos v
		JOIN users u ON v.user_id = u.id
		WHERE u.allow_public_square = 1
		AND v.status = 'done'
	`).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return videos, total, nil
}

// IncrementCollectCount 增加收藏计数
func IncrementCollectCount(videoId int) error {
	_, err := DB.Exec(`
		UPDATE videos SET collect_count = collect_count + 1 WHERE id = ?
	`, videoId)
	return err
}

// CheckVideoIsPublic 检查视频是否可以公开访问
func CheckVideoIsPublic(videoId int) (bool, error) {
	var allow bool
	err := DB.QueryRow(`
		SELECT u.allow_public_square
		FROM videos v
		JOIN users u ON v.user_id = u.id
		WHERE v.id = ?
	`, videoId).Scan(&allow)
	if err != nil {
		return false, err
	}
	return allow, nil
}
