package database

import (
	"time"
)

// SearchHistory 搜索历史模型
type SearchHistory struct {
	ID        int       `json:"id"`
	UserID    int       `json:"userId"`
	Keyword   string    `json:"keyword"`
	CreatedAt time.Time `json:"createdAt"`
}

// SaveSearchHistory 保存搜索历史
func SaveSearchHistory(userId int, keyword string) error {
	_, err := DB.Exec(`
		INSERT INTO search_history (user_id, keyword)
		VALUES (?, ?)
	`, userId, keyword)
	return err
}

// GetSearchHistory 获取搜索历史（最近20条）
func GetSearchHistory(userId int) ([]SearchHistory, error) {
	rows, err := DB.Query(`
		SELECT id, user_id, keyword, created_at
		FROM search_history
		WHERE user_id = ?
		ORDER BY created_at DESC
		LIMIT 20
	`, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var histories []SearchHistory
	for rows.Next() {
		var h SearchHistory
		err := rows.Scan(
			&h.ID,
			&h.UserID,
			&h.Keyword,
			&h.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		histories = append(histories, h)
	}

	return histories, nil
}

// ClearSearchHistory 清空搜索历史
func ClearSearchHistory(userId int) error {
	_, err := DB.Exec(`
		DELETE FROM search_history WHERE user_id = ?
	`, userId)
	return err
}

// SearchVideos 搜索视频（支持关键词、标签、收藏夹组合搜索）
func SearchVideos(userId int, keyword string, tagId, collectionId *int, sortBy string, page, pageSize int) ([]Video, int, error) {
	offset := (page - 1) * pageSize

	// 构建动态SQL
	baseQuery := `
		SELECT DISTINCT v.id, v.title, v.filename, v.originalname, v.thumbnail, v.duration, v.size, v.mimetype, 
			   v.ai_text, v.rewritten_text, v.rewrite_status, v.uploader, v.created_at, v.status, v.user_id
		FROM videos v
		WHERE v.user_id = ?`

	countQuery := `
		SELECT COUNT(DISTINCT v.id)
		FROM videos v
		WHERE v.user_id = ?`

	args := []interface{}{userId}
	countArgs := []interface{}{userId}

	// 关键词搜索（搜索标题、原始名称、AI文案）
	if keyword != "" {
		searchPattern := "%" + keyword + "%"
		baseQuery += ` AND (v.title LIKE ? OR v.originalname LIKE ? OR v.ai_text LIKE ?)`
		countQuery += ` AND (v.title LIKE ? OR v.originalname LIKE ? OR v.ai_text LIKE ?)`
		args = append(args, searchPattern, searchPattern, searchPattern)
		countArgs = append(countArgs, searchPattern, searchPattern, searchPattern)
	}

	// 标签筛选
	if tagId != nil {
		baseQuery += ` JOIN video_tags vt ON v.id = vt.video_id AND vt.tag_id = ?`
		countQuery += ` JOIN video_tags vt ON v.id = vt.video_id AND vt.tag_id = ?`
		args = append(args, *tagId)
		countArgs = append(countArgs, *tagId)
	}

	// 收藏夹筛选
	if collectionId != nil {
		baseQuery += ` JOIN collection_videos cv ON v.id = cv.video_id AND cv.collection_id = ?`
		countQuery += ` JOIN collection_videos cv ON v.id = cv.video_id AND cv.collection_id = ?`
		args = append(args, *collectionId)
		countArgs = append(countArgs, *collectionId)
	}

	// 获取总数
	var total int
	err := DB.QueryRow(countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// 排序
	switch sortBy {
	case "time_asc":
		baseQuery += ` ORDER BY v.created_at ASC`
	case "name":
		baseQuery += ` ORDER BY v.title ASC`
	default:
		baseQuery += ` ORDER BY v.created_at DESC`
	}

	baseQuery += ` LIMIT ? OFFSET ?`
	args = append(args, pageSize, offset)

	rows, err := DB.Query(baseQuery, args...)
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
