package database

import (
	"log"
)

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
