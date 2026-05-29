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
// 基础信息都在这里，所有者的AI结果也存在这里
type Video struct {
	ID               int       `json:"id"`
	Title            string    `json:"title"`
	Filename         string    `json:"filename"`
	Originalname     string    `json:"originalname"`
	Thumbnail        *string   `json:"thumbnail"`
	Duration         float64   `json:"duration"`
	Size             int64     `json:"size"`
	Mimetype         string    `json:"mimetype"`
	AIText           *string   `json:"aiText"`
	RewrittenText    *string   `json:"rewrittenText"`
	RewriteStatus    string    `json:"rewriteStatus"` // idle, rewriting, done, failed
	OriginalSourceID *int      `json:"originalSourceId"`
	Uploader         string    `json:"uploader"`
	CreatedAt        time.Time `json:"createdAt"`
	Status           string    `json:"status"` // processing, done, failed
	UserID           int       `json:"userId"`
}

// UserVideo stores per-user extracted state for a video
type UserVideo struct {
	ID             int       `json:"id"`
	UserID         int       `json:"userId"`
	VideoID        int       `json:"videoId"`
	Extracted      bool      `json:"extracted"`
	Text           *string   `json:"aiText"`
	RewrittenText  *string   `json:"rewrittenText"`
	RewriteStatus  string    `json:"rewriteStatus"` // idle, rewriting, done, failed
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
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
		UNIQUE(user_id, video_id, analysis_type)
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

	// 创建 user_videos 表（每个用户对视频的提取状态，支持广场视频多人独立提取）
	DB.Exec(`
	CREATE TABLE IF NOT EXISTS user_videos (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		video_id INTEGER NOT NULL,
		extracted INTEGER DEFAULT 0,
		text TEXT,
		rewritten_text TEXT,
		rewrite_status TEXT DEFAULT 'idle',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, video_id)
	);
	`)

	// 创建 user_model_configs 表（用户级模型配置）
	DB.Exec(`
	CREATE TABLE IF NOT EXISTS user_model_configs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		config_type TEXT NOT NULL,
		provider TEXT,
		api_key TEXT,
		api_base TEXT,
		model TEXT,
		extra_json TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, config_type)
	);
	`)

	// 添加 original_source_id 字段到 videos 表（兼容旧数据）
	DB.Exec(`ALTER TABLE videos ADD COLUMN original_source_id INTEGER;`)

	log.Println("Database initialized successfully")

	// Run migrations for new features
	RunSquareMigrations()
	FixAnalysisResultsUniqueConstraint()
}

// FixAnalysisResultsUniqueConstraint 修复 analysis_results 唯一约束
// 将 UNIQUE(video_id, analysis_type) 改为 UNIQUE(user_id, video_id, analysis_type)
func FixAnalysisResultsUniqueConstraint() {
	// 检查表是否已经有正确的约束
	var count int
	err := DB.QueryRow(`
		SELECT COUNT(*) FROM sqlite_master 
		WHERE type='index' AND name='sqlite_autoindex_analysis_results_1'
	`).Scan(&count)
	if err != nil || count == 0 {
		return
	}

	// 创建新表并迁移数据
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS analysis_results_new (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			video_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
			analysis_type TEXT NOT NULL,
			result TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_id, video_id, analysis_type)
		);

		INSERT OR IGNORE INTO analysis_results_new 
			(id, video_id, user_id, analysis_type, result, created_at)
		SELECT id, video_id, user_id, analysis_type, result, created_at 
		FROM analysis_results;

		DROP TABLE analysis_results;

		ALTER TABLE analysis_results_new RENAME TO analysis_results;
	`)

	if err != nil {
		log.Printf("Warning: failed to migrate analysis_results unique constraint: %v", err)
	} else {
		log.Println("Fixed analysis_results unique constraint: added user_id to unique key")
	}
}

// GetAllVideos 获取分页视频列表（按用户隔离）
// 包含：用户自己上传的视频 + 用户提取过的广场公开视频
func GetAllVideos(page, pageSize, userId int) ([]Video, int, error) {
	offset := (page - 1) * pageSize

	var total int
	err := DB.QueryRow(`
		SELECT COUNT(DISTINCT v.id)
		FROM videos v
		LEFT JOIN user_videos uv ON v.id = uv.video_id
		WHERE v.user_id = ? OR (uv.user_id = ? AND uv.extracted = 1)
	`, userId, userId).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	rows, err := DB.Query(`
		SELECT DISTINCT v.id, v.title, v.filename, v.originalname, v.thumbnail, v.duration, v.size, v.mimetype, v.ai_text, v.rewritten_text, v.rewrite_status, v.original_source_id, v.uploader, v.created_at, v.status, v.user_id
		FROM videos v
		LEFT JOIN user_videos uv ON v.id = uv.video_id
		WHERE v.user_id = ? OR (uv.user_id = ? AND uv.extracted = 1)
		ORDER BY v.created_at DESC
		LIMIT ? OFFSET ?
	`, userId, userId, pageSize, offset)
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
			&v.OriginalSourceID,
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
		SELECT id, title, filename, originalname, thumbnail, duration, size, mimetype, ai_text, rewritten_text, rewrite_status, original_source_id, uploader, created_at, status, user_id
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
		&v.OriginalSourceID,
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

// GetVideoByIDAndUser 根据ID和用户ID获取视频（用户隔离，用于删除等操作）
func GetVideoByIDAndUser(id, userId int) (*Video, error) {
	var v Video
	err := DB.QueryRow(`
		SELECT id, title, filename, originalname, thumbnail, duration, size, mimetype, ai_text, rewritten_text, rewrite_status, original_source_id, uploader, created_at, status, user_id
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
		&v.OriginalSourceID,
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

// GetUserVideo 获取用户对视频的提取状态
func GetUserVideo(userId, videoId int) (*UserVideo, error) {
	var uv UserVideo
	var extractedInt int
	err := DB.QueryRow(`
		SELECT id, user_id, video_id, extracted, text, rewritten_text, rewrite_status, created_at, updated_at
		FROM user_videos WHERE user_id = ? AND video_id = ?
	`, userId, videoId).Scan(
		&uv.ID,
		&uv.UserID,
		&uv.VideoID,
		&extractedInt,
		&uv.Text,
		&uv.RewrittenText,
		&uv.RewriteStatus,
		&uv.CreatedAt,
		&uv.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	uv.Extracted = extractedInt == 1
	return &uv, nil
}

// UpsertUserVideoText 更新或插入用户提取文案
// 使用 ON CONFLICT DO UPDATE 只更新提取相关列，保留原有改写内容
func UpsertUserVideoText(userId, videoId int, text *string) error {
	_, err := DB.Exec(`
		INSERT INTO user_videos (user_id, video_id, extracted, text, updated_at)
		VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(user_id, video_id) DO UPDATE SET
			extracted = excluded.extracted,
			text = excluded.text,
			updated_at = excluded.updated_at
	`, userId, videoId, text)
	return err
}

// UpsertUserVideoRewritten 更新或插入用户改写文案
// 使用 ON CONFLICT DO UPDATE 只更新改写相关列，保留原有 extracted 和 text
func UpsertUserVideoRewritten(userId, videoId int, rewrittenText *string) error {
	_, err := DB.Exec(`
		INSERT INTO user_videos (user_id, video_id, rewritten_text, rewrite_status, updated_at)
		VALUES (?, ?, ?, 'done', CURRENT_TIMESTAMP)
		ON CONFLICT(user_id, video_id) DO UPDATE SET
			rewritten_text = excluded.rewritten_text,
			rewrite_status = excluded.rewrite_status,
			updated_at = excluded.updated_at
	`, userId, videoId, rewrittenText)
	return err
}

// UpdateUserVideoRewriteStatus 更新用户改写状态
func UpdateUserVideoRewriteStatus(userId, videoId int, status string) error {
	_, err := DB.Exec(`
		UPDATE user_videos SET rewrite_status = ?, updated_at = CURRENT_TIMESTAMP
		WHERE user_id = ? AND video_id = ?
	`, status, userId, videoId)
	return err
}

// EnsureUserVideoExists 确保user_videos记录存在
func EnsureUserVideoExists(userId, videoId int) error {
	_, err := DB.Exec(`
		INSERT OR IGNORE INTO user_videos (user_id, video_id)
		VALUES (?, ?)
	`, userId, videoId)
	return err
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
