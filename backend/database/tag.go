package database

import (
	"time"
)

// Tag 标签模型
type Tag struct {
	ID         int       `json:"id"`
	UserID     int       `json:"userId"`
	Name       string    `json:"name"`
	UsageCount int       `json:"usageCount"`
	CreatedAt  time.Time `json:"createdAt"`
}

// VideoTag 视频与标签关联模型
type VideoTag struct {
	ID        int       `json:"id"`
	VideoID   int       `json:"videoId"`
	TagID     int       `json:"tagId"`
	CreatedAt time.Time `json:"createdAt"`
}

// CreateOrGetTag 创建或获取标签（同一用户标签名唯一）
func CreateOrGetTag(userId int, name string) (int, error) {
	// 先尝试获取已存在的标签
	var existingId int
	err := DB.QueryRow("SELECT id FROM tags WHERE user_id = ? AND name = ?", userId, name).Scan(&existingId)
	if err == nil {
		return existingId, nil
	}

	// 标签不存在，创建新标签
	result, err := DB.Exec(`
		INSERT INTO tags (user_id, name)
		VALUES (?, ?)
	`, userId, name)
	if err != nil {
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	return int(id), nil
}

// AddTagToVideo 给视频添加标签
func AddTagToVideo(videoId, tagId, userId int) error {
	// 验证标签属于该用户
	var tagExists int
	err := DB.QueryRow("SELECT COUNT(*) FROM tags WHERE id = ? AND user_id = ?", tagId, userId).Scan(&tagExists)
	if err != nil || tagExists == 0 {
		return ErrUserNotFound
	}

	_, err = DB.Exec(`
		INSERT OR IGNORE INTO video_tags (video_id, tag_id)
		VALUES (?, ?)
	`, videoId, tagId)
	if err != nil {
		return err
	}

	// 更新标签使用次数
	_, err = DB.Exec(`
		UPDATE tags 
		SET usage_count = (SELECT COUNT(*) FROM video_tags WHERE tag_id = ?)
		WHERE id = ?
	`, tagId, tagId)
	return err
}

// RemoveTagFromVideo 移除视频的某个标签
func RemoveTagFromVideo(videoId, tagId, userId int) error {
	// 验证标签属于该用户
	var tagExists int
	err := DB.QueryRow("SELECT COUNT(*) FROM tags WHERE id = ? AND user_id = ?", tagId, userId).Scan(&tagExists)
	if err != nil || tagExists == 0 {
		return ErrUserNotFound
	}

	_, err = DB.Exec(`
		DELETE FROM video_tags WHERE video_id = ? AND tag_id = ?
	`, videoId, tagId)
	if err != nil {
		return err
	}

	// 更新标签使用次数
	_, err = DB.Exec(`
		UPDATE tags 
		SET usage_count = (SELECT COUNT(*) FROM video_tags WHERE tag_id = ?)
		WHERE id = ?
	`, tagId, tagId)
	return err
}

// GetTagsByUser 获取用户的所有标签
func GetTagsByUser(userId int, page, pageSize int) ([]Tag, int, error) {
	offset := (page - 1) * pageSize

	var total int
	err := DB.QueryRow("SELECT COUNT(*) FROM tags WHERE user_id = ?", userId).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	rows, err := DB.Query(`
		SELECT id, user_id, name, usage_count, created_at
		FROM tags
		WHERE user_id = ?
		ORDER BY usage_count DESC
		LIMIT ? OFFSET ?
	`, userId, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tags []Tag
	for rows.Next() {
		var t Tag
		err := rows.Scan(
			&t.ID,
			&t.UserID,
			&t.Name,
			&t.UsageCount,
			&t.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		tags = append(tags, t)
	}

	return tags, total, nil
}

// GetTagsByVideo 获取某视频的所有标签
func GetTagsByVideo(videoId, userId int) ([]Tag, error) {
	rows, err := DB.Query(`
		SELECT t.id, t.user_id, t.name, t.usage_count, t.created_at
		FROM tags t
		JOIN video_tags vt ON t.id = vt.tag_id
		WHERE vt.video_id = ? AND t.user_id = ?
		ORDER BY t.created_at DESC
	`, videoId, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []Tag
	for rows.Next() {
		var t Tag
		err := rows.Scan(
			&t.ID,
			&t.UserID,
			&t.Name,
			&t.UsageCount,
			&t.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}

	return tags, nil
}

// GetVideosByTag 获取某标签下的所有视频
func GetVideosByTag(tagId, userId int, page, pageSize int) ([]Video, int, error) {
	// 验证标签属于该用户
	var tagExists int
	err := DB.QueryRow("SELECT COUNT(*) FROM tags WHERE id = ? AND user_id = ?", tagId, userId).Scan(&tagExists)
	if err != nil || tagExists == 0 {
		return nil, 0, ErrUserNotFound
	}

	offset := (page - 1) * pageSize

	var total int
	err = DB.QueryRow(`
		SELECT COUNT(*) FROM video_tags vt
		JOIN videos v ON vt.video_id = v.id
		WHERE vt.tag_id = ?
	`, tagId).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	rows, err := DB.Query(`
		SELECT v.id, v.title, v.filename, v.originalname, v.thumbnail, v.duration, v.size, v.mimetype, 
			   v.ai_text, v.rewritten_text, v.rewrite_status, v.uploader, v.created_at, v.status, v.user_id
		FROM video_tags vt
		JOIN videos v ON vt.video_id = v.id
		WHERE vt.tag_id = ?
		ORDER BY vt.created_at DESC
		LIMIT ? OFFSET ?
	`, tagId, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var videos []Video
	for rows.Next() {
		var v Video
		err := rows.Scan(
			&v.ID,
			&v.Title,
			&v.Filename,
			&v.Originalname,
			&v.Thumbnail,
			&v.Duration,
			&v.Size,
			&v.Mimetype,
			&v.AIText,
			&v.RewrittenText,
			&v.RewriteStatus,
			&v.Uploader,
			&v.CreatedAt,
			&v.Status,
			&v.UserID,
		)
		if err != nil {
			return nil, 0, err
		}
		videos = append(videos, v)
	}

	return videos, total, nil
}

// DeleteTag 删除标签（所有视频）
func DeleteTag(tagId, userId int) error {
	_, err := DB.Exec(`
		DELETE FROM tags WHERE id = ? AND user_id = ?
	`, tagId, userId)
	return err
}

// SearchTagsByName 按名称搜索标签（用于标签建议）
func SearchTagsByName(userId int, query string, limit int) ([]Tag, error) {
	rows, err := DB.Query(`
		SELECT id, user_id, name, usage_count, created_at
		FROM tags
		WHERE user_id = ? AND name LIKE ?
		ORDER BY usage_count DESC
		LIMIT ?
	`, userId, "%"+query+"%", limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []Tag
	for rows.Next() {
		var t Tag
		err := rows.Scan(
			&t.ID,
			&t.UserID,
			&t.Name,
			&t.UsageCount,
			&t.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}

	return tags, nil
}
