package database

import (
	"log"
)

// RunStoryboardRunMigrations 执行工作流运行记录数据库迁移
func RunStoryboardRunMigrations() {
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS storyboard_runs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			storyboard_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
			status TEXT NOT NULL DEFAULT 'running',
			total_credits INTEGER DEFAULT 0,
			started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			finished_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (storyboard_id) REFERENCES storyboards(id) ON DELETE CASCADE,
			FOREIGN KEY (user_id) REFERENCES users(id)
		);
	`)
	if err != nil {
		log.Printf("Warning: create storyboard_runs table: %v", err)
	}

	// 孤儿 run 兜底清理：启动时把超过 30 分钟仍 running 的 run 标记为 failed
	// （无取消功能，goroutine panic 或重启可能留下永久 running 的 run，会卡住前端轮询）
	_, err = DB.Exec(`
		UPDATE storyboard_runs
		SET status = 'failed', finished_at = CURRENT_TIMESTAMP
		WHERE status = 'running' AND started_at < datetime('now', '-30 minutes')
	`)
	if err != nil {
		log.Printf("Warning: cleanup orphan runs: %v", err)
	}
}

// RunSquareMigrations 执行短视频广场功能数据库迁移
func RunSquareMigrations() {
	// 1. users表新增 allow_public_square 字段
	// 用户是否允许自己的视频出现在广场
	_, err := DB.Exec(`
		ALTER TABLE users ADD COLUMN allow_public_square INTEGER DEFAULT 1;
	`)
	if err != nil {
		// 如果列已存在，忽略错误
		log.Printf("Warning: add allow_public_square column: %v", err)
	}

	// 2. videos表新增 collect_count 字段
	// 记录被多少用户收藏，用于热门排序
	_, err = DB.Exec(`
		ALTER TABLE videos ADD COLUMN collect_count INTEGER DEFAULT 0;
	`)
	if err != nil {
		log.Printf("Warning: add collect_count column: %v", err)
	}
}
