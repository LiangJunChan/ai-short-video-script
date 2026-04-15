package database

import (
	"database/sql"
	"errors"
	"log"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

// ErrInsufficientCredits 积分不足
var ErrInsufficientCredits = errors.New("积分不足")

// ErrUserNotFound 用户不存在
var ErrUserNotFound = errors.New("用户不存在")

// ErrUserExists 用户已存在
var ErrUserExists = errors.New("用户名已存在")

// WithTransaction 执行事务
func WithTransaction(fn func(*sql.Tx) error) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

// Video 视频模型
type Video struct {
	ID            int       `json:"id"`
	Title         string    `json:"title"`
	Filename      string    `json:"filename"`
	Originalname  string    `json:"originalname"`
	Thumbnail     *string   `json:"thumbnail"`
	Duration      float64   `json:"duration"`
	Size          int64     `json:"size"`
	Mimetype      string    `json:"mimetype"`
	AIText        *string   `json:"aiText"`
	RewrittenText *string   `json:"rewrittenText"`
	RewriteStatus string    `json:"rewriteStatus"` // idle, rewriting, done, failed
	Uploader      string    `json:"uploader"`
	CreatedAt     time.Time `json:"createdAt"`
	Status        string    `json:"status"` // processing, done, failed
	UserID        int       `json:"userId"`
}

func InitDB() {
	var err error
	DB, err = sql.Open("sqlite3", "./videos.db")
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	// 创建 videos 表
	DB.Exec(`
	CREATE TABLE IF NOT EXISTS videos (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		filename TEXT NOT NULL,
		originalname TEXT NOT NULL,
		thumbnail TEXT,
		duration REAL,
		size INTEGER,
		mimetype TEXT,
		ai_text TEXT,
		uploader TEXT DEFAULT '匿名用户',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		status TEXT DEFAULT 'processing',
		user_id INTEGER
	);
	`)

	// 添加后续字段
	DB.Exec(`ALTER TABLE videos ADD COLUMN rewritten_text TEXT;`)
	DB.Exec(`ALTER TABLE videos ADD COLUMN rewrite_status TEXT DEFAULT 'idle';`)

	// 创建 users 表
	DB.Exec(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		user_type TEXT DEFAULT 'normal',
		credits INTEGER DEFAULT 0,
		last_login_bonus_at DATETIME,
		last_login_at DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`)

	// 创建 credit_logs 表
	DB.Exec(`
	CREATE TABLE IF NOT EXISTS credit_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		action TEXT NOT NULL,
		amount INTEGER NOT NULL,
		balance_after INTEGER NOT NULL,
		video_id INTEGER,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`)

	// 创建 video_credits 表（防重复扣费）
	DB.Exec(`
	CREATE TABLE IF NOT EXISTS video_credits (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		video_id INTEGER NOT NULL,
		user_id INTEGER NOT NULL,
		extract_done INTEGER DEFAULT 0,
		rewrite_done INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(video_id, user_id)
	);
	`)

	// 创建 checkin_logs 表（签到记录）
	DB.Exec(`
	CREATE TABLE IF NOT EXISTS checkin_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		checkin_date DATE NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, checkin_date)
	);
	`)

	// 创建 analysis_results 表（分析结果存储）
	DB.Exec(`
	CREATE TABLE IF NOT EXISTS analysis_results (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		video_id INTEGER NOT NULL,
		user_id INTEGER NOT NULL,
		analysis_type TEXT NOT NULL,
		result TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(video_id, analysis_type)
	);
	`)

	// 为 video_credits 表添加分析类型字段（如果不存在）
	DB.Exec(`ALTER TABLE video_credits ADD COLUMN structure_done INTEGER DEFAULT 0;`)
	DB.Exec(`ALTER TABLE video_credits ADD COLUMN viral_points_done INTEGER DEFAULT 0;`)
	DB.Exec(`ALTER TABLE video_credits ADD COLUMN tags_done INTEGER DEFAULT 0;`)
	DB.Exec(`ALTER TABLE video_credits ADD COLUMN rhythm_done INTEGER DEFAULT 0;`)

	// 创建 collections 表（收藏夹）
	DB.Exec(`
	CREATE TABLE IF NOT EXISTS collections (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		icon TEXT,
		color TEXT,
		description TEXT,
		video_count INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);
	`)

	// 创建 collection_videos 表（收藏夹与视频关联）
	DB.Exec(`
	CREATE TABLE IF NOT EXISTS collection_videos (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		collection_id INTEGER NOT NULL,
		video_id INTEGER NOT NULL,
		added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(collection_id, video_id),
		FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
		FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
	);
	`)

	// 创建 tags 表（标签）
	DB.Exec(`
	CREATE TABLE IF NOT EXISTS tags (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		usage_count INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, name),
		FOREIGN KEY (user_id) REFERENCES users(id)
	);
	`)

	// 创建 video_tags 表（视频与标签关联）
	DB.Exec(`
	CREATE TABLE IF NOT EXISTS video_tags (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		video_id INTEGER NOT NULL,
		tag_id INTEGER NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(video_id, tag_id),
		FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
		FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
	);
	`)

	// 创建 search_history 表（搜索历史）
	DB.Exec(`
	CREATE TABLE IF NOT EXISTS search_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		keyword TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);
	`)

	log.Println("Database initialized successfully")
}

// GetAllVideos 获取分页视频列表（按用户隔离）
func GetAllVideos(page, pageSize, userId int) ([]Video, int, error) {
	offset := (page - 1) * pageSize

	var total int
	err := DB.QueryRow("SELECT COUNT(*) FROM videos WHERE user_id = ?", userId).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	rows, err := DB.Query(`
		SELECT id, title, filename, originalname, thumbnail, duration, size, mimetype, ai_text, rewritten_text, rewrite_status, uploader, created_at, status, user_id
		FROM videos
		WHERE user_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, userId, pageSize, offset)
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

// GetVideoByID 根据ID获取视频详情
func GetVideoByID(id int) (*Video, error) {
	var v Video
	err := DB.QueryRow(`
		SELECT id, title, filename, originalname, thumbnail, duration, size, mimetype, ai_text, rewritten_text, rewrite_status, uploader, created_at, status, user_id
		FROM videos WHERE id = ?
	`, id).Scan(
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
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &v, nil
}

// GetVideoByIDAndUser 根据ID和用户ID获取视频（用户隔离）
func GetVideoByIDAndUser(id, userId int) (*Video, error) {
	var v Video
	err := DB.QueryRow(`
		SELECT id, title, filename, originalname, thumbnail, duration, size, mimetype, ai_text, rewritten_text, rewrite_status, uploader, created_at, status, user_id
		FROM videos WHERE id = ? AND user_id = ?
	`, id, userId).Scan(
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
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &v, nil
}

// CreateVideo 创建视频记录（带用户ID）
func CreateVideo(title, filename, originalname, thumbnail string, duration float64, size int64, mimetype, uploader string, userId int) (int, error) {
	var thumbnailPtr *string
	if thumbnail != "" {
		thumbnailPtr = &thumbnail
	}

	result, err := DB.Exec(`
		INSERT INTO videos (title, filename, originalname, thumbnail, duration, size, mimetype, uploader, user_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, title, filename, originalname, thumbnailPtr, duration, size, mimetype, uploader, userId)
	if err != nil {
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	return int(id), nil
}

// UpdateVideoAIResult 更新AI提取结果
func UpdateVideoAIResult(id int, aiText *string, status string) error {
	_, err := DB.Exec(`
		UPDATE videos SET ai_text = ?, status = ? WHERE id = ?
	`, aiText, status, id)
	return err
}

// UpdateVideoRewrittenText 更新AI改写结果
func UpdateVideoRewrittenText(id int, rewrittenText *string) error {
	_, err := DB.Exec(`
		UPDATE videos SET rewritten_text = ?, rewrite_status = 'done' WHERE id = ?
	`, rewrittenText, id)
	return err
}

// UpdateRewriteStatus 更新改写状态
func UpdateRewriteStatus(id int, status string) error {
	_, err := DB.Exec(`
		UPDATE videos SET rewrite_status = ? WHERE id = ?
	`, status, id)
	return err
}

// GetAnalysisResult 获取视频的分析结果
func GetAnalysisResult(videoId, userId int, analysisType string) (string, error) {
	var result string
	err := DB.QueryRow(
		"SELECT result FROM analysis_results WHERE video_id = ? AND user_id = ? AND analysis_type = ?",
		videoId, userId, analysisType,
	).Scan(&result)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return result, err
}

// SaveAnalysisResult 保存分析结果
func SaveAnalysisResult(videoId, userId int, analysisType, result string) error {
	_, err := DB.Exec(`
		INSERT OR REPLACE INTO analysis_results (video_id, user_id, analysis_type, result)
		VALUES (?, ?, ?, ?)
	`, videoId, userId, analysisType, result)
	return err
}

// GetAnalysisResultsByVideo 获取视频的所有分析结果
func GetAnalysisResultsByVideo(videoId, userId int) (map[string]string, error) {
	results := make(map[string]string)
	rows, err := DB.Query(
		"SELECT analysis_type, result FROM analysis_results WHERE video_id = ? AND user_id = ?",
		videoId, userId,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var analysisType, result string
		if err := rows.Scan(&analysisType, &result); err != nil {
			return nil, err
		}
		results[analysisType] = result
	}
	return results, nil
}
