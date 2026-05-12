package database

import (
	"database/sql"
	"errors"
	"log"
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
			v.thumbnail,
			u.username,
			GROUP_CONCAT(t.name, ', ') AS tags,
			IFNULL(v.collect_count, 0),
			v.created_at
		FROM videos v
		JOIN users u ON v.user_id = u.id
		LEFT JOIN video_tags vt ON v.id = vt.video_id
		LEFT JOIN tags t ON vt.tag_id = t.id
		WHERE IFNULL(u.allow_public_square, 1) = 1
		AND v.status = 'done'
		AND original_source_id IS NULL
		GROUP BY v.id, v.title, v.thumbnail, u.username, v.collect_count, v.created_at, v.original_source_id
	`

	var orderClause string
	switch sortBy {
	case "popular":
		orderClause = " ORDER BY IFNULL(v.collect_count, 0) DESC, v.created_at DESC"
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
		WHERE IFNULL(u.allow_public_square, 1) = 1
		AND v.status = 'done'
		AND original_source_id IS NULL
	`).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return videos, total, nil
}

// CollectSquareVideo 收藏广场视频到个人素材库
// 不创建新视频副本，只确保user_videos存在，添加到收藏夹（如果指定），返回原视频ID
// 用户提取后会出现在个人列表中
func CollectSquareVideo(userId int, collectionID *int, originalVideoId int) (int, error) {
	// Check if original video is public
	isPublic, err := CheckVideoIsPublic(originalVideoId)
	if err != nil {
		return 0, err
	}
	if !isPublic {
		return 0, errors.New("video is not public")
	}

	// 2. 确保user_videos记录存在，这样用户首页列表就能看到
	err = EnsureUserVideoExists(userId, originalVideoId)
	if err != nil {
		return 0, err
	}

	// 3. 如果指定了收藏夹，添加原视频到收藏夹
	if collectionID != nil {
		err := AddVideoToCollection(*collectionID, originalVideoId, userId)
		if err != nil {
			return 0, err
		}
	}

	// 4. 增加原视频收藏计数
	if err := IncrementCollectCount(originalVideoId); err != nil {
		log.Printf("warning: failed to increment collect count for video %d: %v", originalVideoId, err)
	}

	// 返回原视频ID，URL保持不变
	return originalVideoId, nil
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
		SELECT IFNULL(u.allow_public_square, 1)
		FROM videos v
		JOIN users u ON v.user_id = u.id
		WHERE v.id = ?
	`, videoId).Scan(&allow)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return allow, nil
}
