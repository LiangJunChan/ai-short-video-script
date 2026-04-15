package service

import (
	"database/sql"
	"errors"

	"ai-short-video-backend/database"
)

var ErrInsufficientCredits = errors.New("积分不足")

const extractCost = 5  // 提取文案消耗积分
const rewriteCost = 10 // AI改写消耗积分

// 分析类积分常量
const (
	StructureAnalysisCost = 5 // 文案结构分析
	ViralPointsCost       = 3 // 爆款点提炼
	TagsExtractCost       = 2 // 选题标签提取
	RhythmAnalysisCost    = 4 // 口播节奏分析
	ReportCost            = 6 // 完整分析报告
)

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
		switch action {
		case "rewrite":
			col = "rewrite_done"
		case "structure_analysis":
			col = "structure_done"
		case "viral_points":
			col = "viral_points_done"
		case "tags_extract":
			col = "tags_done"
		case "rhythm_analysis":
			col = "rhythm_done"
		case "report":
			col = "report_done"
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
		switch action {
		case "extract":
			tx.Exec(`
				INSERT OR IGNORE INTO video_credits (video_id, user_id, extract_done)
				VALUES (?, ?, 1)
			`, videoId, userId)
			tx.Exec(`
				UPDATE video_credits SET extract_done = 1
				WHERE video_id = ? AND user_id = ?
			`, videoId, userId)
		case "rewrite":
			tx.Exec(`
				INSERT OR IGNORE INTO video_credits (video_id, user_id, rewrite_done)
				VALUES (?, ?, 1)
			`, videoId, userId)
			tx.Exec(`
				UPDATE video_credits SET rewrite_done = 1
				WHERE video_id = ? AND user_id = ?
			`, videoId, userId)
		case "structure_analysis":
			tx.Exec(`
				INSERT OR IGNORE INTO video_credits (video_id, user_id, structure_done)
				VALUES (?, ?, 1)
			`, videoId, userId)
			tx.Exec(`
				UPDATE video_credits SET structure_done = 1
				WHERE video_id = ? AND user_id = ?
			`, videoId, userId)
		case "viral_points":
			tx.Exec(`
				INSERT OR IGNORE INTO video_credits (video_id, user_id, viral_points_done)
				VALUES (?, ?, 1)
			`, videoId, userId)
			tx.Exec(`
				UPDATE video_credits SET viral_points_done = 1
				WHERE video_id = ? AND user_id = ?
			`, videoId, userId)
		case "tags_extract":
			tx.Exec(`
				INSERT OR IGNORE INTO video_credits (video_id, user_id, tags_done)
				VALUES (?, ?, 1)
			`, videoId, userId)
			tx.Exec(`
				UPDATE video_credits SET tags_done = 1
				WHERE video_id = ? AND user_id = ?
			`, videoId, userId)
		case "rhythm_analysis":
			tx.Exec(`
				INSERT OR IGNORE INTO video_credits (video_id, user_id, rhythm_done)
				VALUES (?, ?, 1)
			`, videoId, userId)
			tx.Exec(`
				UPDATE video_credits SET rhythm_done = 1
				WHERE video_id = ? AND user_id = ?
			`, videoId, userId)
		case "report":
			tx.Exec(`
				INSERT OR IGNORE INTO video_credits (video_id, user_id, report_done)
				VALUES (?, ?, 1)
			`, videoId, userId)
			tx.Exec(`
				UPDATE video_credits SET report_done = 1
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

// DeductStructureAnalysisCredits 扣减文案结构分析积分
func DeductStructureAnalysisCredits(userId, videoId int) error {
	return deductCredits(userId, videoId, "structure_analysis", StructureAnalysisCost)
}

// DeductViralPointsCredits 扣减爆款点提炼积分
func DeductViralPointsCredits(userId, videoId int) error {
	return deductCredits(userId, videoId, "viral_points", ViralPointsCost)
}

// DeductTagsExtractCredits 扣减标签提取积分
func DeductTagsExtractCredits(userId, videoId int) error {
	return deductCredits(userId, videoId, "tags_extract", TagsExtractCost)
}

// DeductRhythmAnalysisCredits 扣减节奏分析积分
func DeductRhythmAnalysisCredits(userId, videoId int) error {
	return deductCredits(userId, videoId, "rhythm_analysis", RhythmAnalysisCost)
}

// DeductReportCredits 扣减完整分析报告积分
func DeductReportCredits(userId, videoId int) error {
	return deductCredits(userId, videoId, "report", ReportCost)
}
