package database

import (
	"database/sql"
	"time"
)

// Collection 收藏夹模型
type Collection struct {
	ID          int       `json:"id"`
	UserID      int       `json:"userId"`
	Name        string    `json:"name"`
	Icon        *string   `json:"icon"`
	Color       *string   `json:"color"`
	Description *string   `json:"description"`
	VideoCount  int       `json:"videoCount"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// CollectionVideo 收藏夹与视频关联模型
type CollectionVideo struct {
	ID           int       `json:"id"`
	CollectionID int       `json:"collectionId"`
	VideoID      int       `json:"videoId"`
	AddedAt      time.Time `json:"addedAt"`
}

// CreateCollection 创建收藏夹
func CreateCollection(userId int, name, icon, color, description string) (int, error) {
	result, err := DB.Exec(`
		INSERT INTO collections (user_id, name, icon, color, description)
		VALUES (?, ?, ?, ?, ?)
	`, userId, name, icon, color, description)
	if err != nil {
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	return int(id), nil
}

// GetCollectionsByUser 获取用户的所有收藏夹列表
func GetCollectionsByUser(userId int, page, pageSize int) ([]Collection, int, error) {
	offset := (page - 1) * pageSize

	var total int
	err := DB.QueryRow("SELECT COUNT(*) FROM collections WHERE user_id = ?", userId).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	rows, err := DB.Query(`
		SELECT id, user_id, name, icon, color, description, video_count, created_at, updated_at
		FROM collections
		WHERE user_id = ?
		ORDER BY updated_at DESC
		LIMIT ? OFFSET ?
	`, userId, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var collections []Collection
	for rows.Next() {
		var c Collection
		err := rows.Scan(
			&c.ID,
			&c.UserID,
			&c.Name,
			&c.Icon,
			&c.Color,
			&c.Description,
			&c.VideoCount,
			&c.CreatedAt,
			&c.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		collections = append(collections, c)
	}

	return collections, total, nil
}

// GetCollectionByIDAndUser 根据ID和用户ID获取收藏夹
func GetCollectionByIDAndUser(collectionId, userId int) (*Collection, error) {
	var c Collection
	err := DB.QueryRow(`
		SELECT id, user_id, name, icon, color, description, video_count, created_at, updated_at
		FROM collections WHERE id = ? AND user_id = ?
	`, collectionId, userId).Scan(
		&c.ID,
		&c.UserID,
		&c.Name,
		&c.Icon,
		&c.Color,
		&c.Description,
		&c.VideoCount,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

// UpdateCollection 更新收藏夹信息
func UpdateCollection(collectionId, userId int, name, icon, color, description string) error {
	_, err := DB.Exec(`
		UPDATE collections 
		SET name = ?, icon = ?, color = ?, description = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND user_id = ?
	`, name, icon, color, description, collectionId, userId)
	return err
}

// DeleteCollection 删除收藏夹（关联的视频记录也会因CASCADE删除）
func DeleteCollection(collectionId, userId int) error {
	_, err := DB.Exec(`
		DELETE FROM collections WHERE id = ? AND user_id = ?
	`, collectionId, userId)
	return err
}

// AddVideoToCollection 添加视频到收藏夹
func AddVideoToCollection(collectionId, videoId, userId int) error {
	// 先验证收藏夹属于该用户
	collection, err := GetCollectionByIDAndUser(collectionId, userId)
	if err != nil || collection == nil {
		return ErrUserNotFound // 收藏夹不存在
	}

	_, err = DB.Exec(`
		INSERT OR IGNORE INTO collection_videos (collection_id, video_id)
		VALUES (?, ?)
	`, collectionId, videoId)
	if err != nil {
		return err
	}

	// 更新收藏夹的视频数量
	_, err = DB.Exec(`
		UPDATE collections 
		SET video_count = (SELECT COUNT(*) FROM collection_videos WHERE collection_id = ?),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, collectionId, collectionId)
	return err
}

// RemoveVideoFromCollection 从收藏夹移除视频
func RemoveVideoFromCollection(collectionId, videoId, userId int) error {
	// 先验证收藏夹属于该用户
	collection, err := GetCollectionByIDAndUser(collectionId, userId)
	if err != nil || collection == nil {
		return ErrUserNotFound
	}

	_, err = DB.Exec(`
		DELETE FROM collection_videos WHERE collection_id = ? AND video_id = ?
	`, collectionId, videoId)
	if err != nil {
		return err
	}

	// 更新收藏夹的视频数量
	_, err = DB.Exec(`
		UPDATE collections 
		SET video_count = (SELECT COUNT(*) FROM collection_videos WHERE collection_id = ?),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, collectionId, collectionId)
	return err
}

// GetVideosByCollection 获取收藏夹内的视频列表
func GetVideosByCollection(collectionId, userId int, page, pageSize int) ([]Video, int, error) {
	// 先验证收藏夹属于该用户
	collection, err := GetCollectionByIDAndUser(collectionId, userId)
	if err != nil || collection == nil {
		return nil, 0, ErrUserNotFound
	}

	offset := (page - 1) * pageSize

	var total int
	err = DB.QueryRow(`
		SELECT COUNT(*) FROM collection_videos cv
		JOIN videos v ON cv.video_id = v.id
		WHERE cv.collection_id = ?
	`, collectionId).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	rows, err := DB.Query(`
		SELECT v.id, v.title, v.filename, v.originalname, v.thumbnail, v.duration, v.size, v.mimetype, 
			   v.ai_text, v.rewritten_text, v.rewrite_status, v.uploader, v.created_at, v.status, v.user_id
		FROM collection_videos cv
		JOIN videos v ON cv.video_id = v.id
		WHERE cv.collection_id = ?
		ORDER BY cv.added_at DESC
		LIMIT ? OFFSET ?
	`, collectionId, pageSize, offset)
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

// GetCollectionsByVideo 获取包含某视频的所有收藏夹
func GetCollectionsByVideo(videoId, userId int) ([]Collection, error) {
	rows, err := DB.Query(`
		SELECT c.id, c.user_id, c.name, c.icon, c.color, c.description, c.video_count, c.created_at, c.updated_at
		FROM collections c
		JOIN collection_videos cv ON c.id = cv.collection_id
		WHERE cv.video_id = ? AND c.user_id = ?
		ORDER BY c.updated_at DESC
	`, videoId, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collections []Collection
	for rows.Next() {
		var c Collection
		err := rows.Scan(
			&c.ID,
			&c.UserID,
			&c.Name,
			&c.Icon,
			&c.Color,
			&c.Description,
			&c.VideoCount,
			&c.CreatedAt,
			&c.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		collections = append(collections, c)
	}

	return collections, nil
}
