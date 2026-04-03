package service

import (
	"database/sql"
	"errors"

	"ai-short-video-backend/database"
)

var ErrInsufficientCredits = errors.New("积分不足")

const extractCost = 5  // 提取文案消耗积分
const rewriteCost = 10 // AI改写消耗积分

// DeductExtractCredits 扣减提取文案积分（原子操作）
func DeductExtractCredits(userId, videoId int) error {
	return deductCredits(userId, videoId, "extract", extractCost)
}

// DeductRewriteCredits 扣减AI改写积分（原子操作）
func DeductRewriteCredits(userId, videoId int) error {
	return deductCredits(userId, videoId, "rewrite", rewriteCost)
}

func deductCredits(userId, videoId int, action string, cost int) error {
	return database.WithTransaction(func(tx *sql.Tx) error {
		// 1. 查询用户类型和积分
		var userType string
		var credits int
		err := tx.QueryRow(
			"SELECT user_type, credits FROM users WHERE id = ?",
			userId,
		).Scan(&userType, &credits)
		if err != nil {
			return err
		}

		// 管理员无限积分
		if userType == "admin" {
			return nil
		}

		// 2. 检查是否已扣过费
		var done int
		col := "extract_done"
		if action == "rewrite" {
			col = "rewrite_done"
		}
		err = tx.QueryRow(
			"SELECT "+col+" FROM video_credits WHERE video_id = ? AND user_id = ?",
			videoId, userId,
		).Scan(&done)
		if err == nil && done == 1 {
			// 已扣过，直接返回
			return nil
		}

		// 3. 积分不足检查
		if credits < cost {
			return ErrInsufficientCredits
		}

		// 4. 乐观锁扣减积分
		result, err := tx.Exec(
			"UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?",
			cost, userId, cost,
		)
		if err != nil {
			return err
		}
		affected, _ := result.RowsAffected()
		if affected == 0 {
			return ErrInsufficientCredits
		}

		// 5. 标记该视频该操作已扣费
		if action == "extract" {
			tx.Exec(`
				INSERT OR IGNORE INTO video_credits (video_id, user_id, extract_done)
				VALUES (?, ?, 1)
			`, videoId, userId)
			tx.Exec(`
				UPDATE video_credits SET extract_done = 1
				WHERE video_id = ? AND user_id = ?
			`, videoId, userId)
		} else {
			tx.Exec(`
				INSERT OR IGNORE INTO video_credits (video_id, user_id, rewrite_done)
				VALUES (?, ?, 1)
			`, videoId, userId)
			tx.Exec(`
				UPDATE video_credits SET rewrite_done = 1
				WHERE video_id = ? AND user_id = ?
			`, videoId, userId)
		}

		// 6. 记录积分日志
		var newCredits int
		tx.QueryRow("SELECT credits FROM users WHERE id = ?", userId).Scan(&newCredits)
		tx.Exec(`
			INSERT INTO credit_logs (user_id, action, amount, balance_after, video_id)
			VALUES (?, ?, ?, ?, ?)
		`, userId, action, -cost, newCredits, videoId)

		return nil
	})
}

