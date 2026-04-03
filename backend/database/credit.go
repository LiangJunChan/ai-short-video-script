package database

import (
	"database/sql"
	"time"
)

// CreditLog 积分日志模型
type CreditLog struct {
	ID           int       `json:"id"`
	UserID       int       `json:"userId"`
	Action       string    `json:"action"`
	Amount       int       `json:"amount"`
	BalanceAfter int       `json:"balanceAfter"`
	VideoID      *int      `json:"videoId,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

// GetCreditLogs 获取用户积分日志
func GetCreditLogs(userId int) ([]CreditLog, error) {
	rows, err := DB.Query(`
		SELECT id, user_id, action, amount, balance_after, video_id, created_at
		FROM credit_logs
		WHERE user_id = ?
		ORDER BY created_at DESC
		LIMIT 50
	`, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []CreditLog
	for rows.Next() {
		var log CreditLog
		err := rows.Scan(
			&log.ID, &log.UserID, &log.Action, &log.Amount,
			&log.BalanceAfter, &log.VideoID, &log.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}
	return logs, nil
}

// LogCredit 记录积分变动
func LogCredit(tx *sql.Tx, userId int, action string, amount, balanceAfter int, videoId *int) error {
	_, err := tx.Exec(`
		INSERT INTO credit_logs (user_id, action, amount, balance_after, video_id)
		VALUES (?, ?, ?, ?, ?)
	`, userId, action, amount, balanceAfter, videoId)
	return err
}

// IsExtractDone 检查提取是否已完成扣费
func IsExtractDone(tx *sql.Tx, videoId, userId int) (bool, error) {
	var done int
	err := tx.QueryRow(
		"SELECT extract_done FROM video_credits WHERE video_id = ? AND user_id = ?",
		videoId, userId,
	).Scan(&done)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return done == 1, nil
}

// IsRewriteDone 检查改写是否已完成扣费
func IsRewriteDone(tx *sql.Tx, videoId, userId int) (bool, error) {
	var done int
	err := tx.QueryRow(
		"SELECT rewrite_done FROM video_credits WHERE video_id = ? AND user_id = ?",
		videoId, userId,
	).Scan(&done)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return done == 1, nil
}

// MarkExtractDone 标记提取已扣费
func MarkExtractDone(tx *sql.Tx, videoId, userId int) error {
	_, err := tx.Exec(`
		INSERT OR IGNORE INTO video_credits (video_id, user_id, extract_done)
		VALUES (?, ?, 1)
	`, videoId, userId)
	if err != nil {
		return err
	}
	_, err = tx.Exec(`
		UPDATE video_credits SET extract_done = 1
		WHERE video_id = ? AND user_id = ?
	`, videoId, userId)
	return err
}

// MarkRewriteDone 标记改写已扣费
func MarkRewriteDone(tx *sql.Tx, videoId, userId int) error {
	_, err := tx.Exec(`
		INSERT OR IGNORE INTO video_credits (video_id, user_id, rewrite_done)
		VALUES (?, ?, 1)
	`, videoId, userId)
	if err != nil {
		return err
	}
	_, err = tx.Exec(`
		UPDATE video_credits SET rewrite_done = 1
		WHERE video_id = ? AND user_id = ?
	`, videoId, userId)
	return err
}
