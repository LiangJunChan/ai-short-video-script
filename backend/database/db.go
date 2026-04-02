package database

import (
	"database/sql"
	"log"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

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
}

func InitDB() {
	var err error
	DB, err = sql.Open("sqlite3", "./videos.db")
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	createTableSQL := `
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
		status TEXT DEFAULT 'processing'
	);
	`

	_, err = DB.Exec(createTableSQL)
	if err != nil {
		log.Fatalf("Failed to create table: %v", err)
	}

	// 添加 rewritten_text 列（如果不存在）
	DB.Exec(`ALTER TABLE videos ADD COLUMN rewritten_text TEXT;`)
	// 添加 rewrite_status 列（如果不存在）
	DB.Exec(`ALTER TABLE videos ADD COLUMN rewrite_status TEXT DEFAULT 'idle';`)

	log.Println("Database initialized successfully")
}

// GetAllVideos 获取分页视频列表
func GetAllVideos(page, pageSize int) ([]Video, int, error) {
	offset := (page - 1) * pageSize

	var total int
	err := DB.QueryRow("SELECT COUNT(*) FROM videos").Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	rows, err := DB.Query(`
		SELECT id, title, filename, originalname, thumbnail, duration, size, mimetype, ai_text, rewritten_text, rewrite_status, uploader, created_at, status
		FROM videos
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, pageSize, offset)
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
		SELECT id, title, filename, originalname, thumbnail, duration, size, mimetype, ai_text, rewritten_text, rewrite_status, uploader, created_at, status
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
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &v, nil
}

// CreateVideo 创建视频记录
func CreateVideo(title, filename, originalname, thumbnail string, duration float64, size int64, mimetype, uploader string) (int, error) {
	var thumbnailPtr *string
	if thumbnail != "" {
		thumbnailPtr = &thumbnail
	}

	result, err := DB.Exec(`
		INSERT INTO videos (title, filename, originalname, thumbnail, duration, size, mimetype, uploader)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, title, filename, originalname, thumbnailPtr, duration, size, mimetype, uploader)
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
