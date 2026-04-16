package database

import (
	"database/sql"
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
		GROUP BY v.id, v.title, v.thumbnail, u.username, v.collect_count, v.created_at
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
	`).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return videos, total, nil
}

// CollectSquareVideo 收藏广场视频到个人素材库
// 在当前用户下创建一个新的视频副本，只复制公开信息，文案需要重新提取
func CollectSquareVideo(userId int, collectionID *int, originalVideoId int) (int, error) {
	// 1. 获取原视频信息
	original, err := GetVideoByID(originalVideoId)
	if err != nil {
		return 0, err
	}

	// 2. 在当前用户下创建新视频副本
	query := `
		INSERT INTO videos (
			title,
			thumbnail,
			status,
			user_id,
			collect_count,
			created_at
		) VALUES (?, ?, 'idle', ?, 0, CURRENT_TIMESTAMP)
	`
	res, err := DB.Exec(query, original.Title, original.Thumbnail, userId)
	if err != nil {
		return 0, err
	}

	newVideoId, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	// 3. 如果指定了收藏夹，添加到收藏夹
	if collectionID != nil {
		err := AddVideoToCollection(*collectionID, int(newVideoId), userId)
		if err != nil {
			return 0, err
		}
	}

	// 4. 增加原视频收藏计数
	_ = IncrementCollectCount(originalVideoId)

	// 5. 复制标签（如果原视频有标签）
	// 查询原视频的所有标签ID
	tagRows, err := DB.Query(`
		SELECT tag_id FROM video_tags WHERE video_id = ?
	`, originalVideoId)
	if err == nil {
		defer tagRows.Close()
		for tagRows.Next() {
			var tagId int
			if tagRows.Scan(&tagId) == nil {
				// 添加到新视频
				_, _ = DB.Exec(`
					INSERT OR IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)
				`, int(newVideoId), tagId)
			}
		}
	}

	return int(newVideoId), nil
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
