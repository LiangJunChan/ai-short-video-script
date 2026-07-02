package database

import (
	"database/sql"
	"errors"
	"log"
	"time"
)

// EmailCode 邮箱验证码模型
type EmailCode struct {
	ID         int        `json:"id"`
	Email      string     `json:"email"`
	Code       string     `json:"code"`
	Purpose    string     `json:"purpose"` // register, login, reset_password
	ExpiresAt  time.Time  `json:"expiresAt"`
	ErrorCount int        `json:"errorCount"`
	LockedUntil *time.Time `json:"lockedUntil"`
	CreatedAt  time.Time  `json:"createdAt"`
}

// ErrCodeNotFound 验证码不存在
var ErrCodeNotFound = errors.New("验证码不存在或已过期")

// ErrCodeLocked 验证码已锁定
var ErrCodeLocked = errors.New("验证码错误次数过多，请10分钟后再试")

// ErrCodeExpired 验证码已过期
var ErrCodeExpired = errors.New("验证码已过期")

// ErrCodeTooFrequent 发送太频繁
var ErrCodeTooFrequent = errors.New("发送验证码太频繁，请60秒后再试")

// RunEmailAuthMigrations 执行邮箱登录功能数据库迁移
func RunEmailAuthMigrations() {
	// users 表新增 email 字段（忽略错误，可能已存在）
	// 注意：SQLite 不允许给已有表添加带 UNIQUE 约束的列，所以这里不加 UNIQUE
	_, err := DB.Exec(`ALTER TABLE users ADD COLUMN email TEXT;`)
	if err != nil {
		// 如果列已存在，忽略错误
		log.Printf("Warning: add email column: %v", err)
	}

	// 创建 email_codes 表
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS email_codes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL,
			code TEXT NOT NULL,
			purpose TEXT NOT NULL,
			expires_at DATETIME NOT NULL,
			error_count INTEGER DEFAULT 0,
			locked_until DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		log.Printf("Warning: create email_codes table: %v", err)
	}

	// 创建邮箱索引
	_, err = DB.Exec(`
		CREATE INDEX IF NOT EXISTS idx_email_codes_email ON email_codes(email);
	`)
	if err != nil {
		log.Printf("Warning: create email_codes index: %v", err)
	}
}

// SaveEmailCode 保存验证码（先清理该邮箱已过期的旧验证码）
func SaveEmailCode(email, code, purpose string) error {
	log.Printf("[SaveEmailCode] email=%s, code=%s, purpose=%s", email, code, purpose)
	// 先清理该邮箱已过期的旧验证码
	_, err := DB.Exec(`DELETE FROM email_codes WHERE email = ? AND expires_at < datetime('now')`, email)
	if err != nil {
		log.Printf("[SaveEmailCode] 清理过期验证码失败: %v", err)
		return err
	}

	// 再清理该邮箱相同用途的旧验证码（无论是否过期）
	_, err = DB.Exec(`DELETE FROM email_codes WHERE email = ? AND purpose = ?`, email, purpose)
	if err != nil {
		log.Printf("[SaveEmailCode] 清理旧验证码失败: %v", err)
		return err
	}

	// 插入新验证码
	result, err := DB.Exec(`
		INSERT INTO email_codes (email, code, purpose, expires_at)
		VALUES (?, ?, ?, datetime('now', '+5 minutes'))
	`, email, code, purpose)
	if err != nil {
		log.Printf("[SaveEmailCode] 插入验证码失败: %v", err)
		return err
	}
	id, _ := result.LastInsertId()
	log.Printf("[SaveEmailCode] 验证码已保存, id=%d", id)
	return nil
}

// GetEmailCode 查询验证码
func GetEmailCode(email, code, purpose string) (*EmailCode, error) {
	var ec EmailCode
	err := DB.QueryRow(`
		SELECT id, email, code, purpose, expires_at, error_count, locked_until, created_at
		FROM email_codes
		WHERE email = ? AND code = ? AND purpose = ?
		ORDER BY created_at DESC LIMIT 1
	`, email, code, purpose).Scan(
		&ec.ID, &ec.Email, &ec.Code, &ec.Purpose, &ec.ExpiresAt,
		&ec.ErrorCount, &ec.LockedUntil, &ec.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrCodeNotFound
		}
		return nil, err
	}
	return &ec, nil
}

// IncrementCodeError 增加错误次数，超过5次锁定10分钟
func IncrementCodeError(codeID int) error {
	// 先获取当前错误次数
	var errorCount int
	err := DB.QueryRow(`SELECT error_count FROM email_codes WHERE id = ?`, codeID).Scan(&errorCount)
	if err != nil {
		return err
	}

	errorCount++
	if errorCount >= 5 {
		// 锁定10分钟
		_, err = DB.Exec(`
			UPDATE email_codes SET error_count = ?, locked_until = datetime('now', '+10 minutes') WHERE id = ?
		`, errorCount, codeID)
	} else {
		_, err = DB.Exec(`UPDATE email_codes SET error_count = ? WHERE id = ?`, errorCount, codeID)
	}
	return err
}

// DeleteUsedCode 验证成功后删除验证码
func DeleteUsedCode(codeID int) error {
	_, err := DB.Exec(`DELETE FROM email_codes WHERE id = ?`, codeID)
	return err
}

// CheckSendFrequency 检查发送频率，60秒内不能重复发送
func CheckSendFrequency(email, purpose string) error {
	var count int
	err := DB.QueryRow(`
		SELECT COUNT(*) FROM email_codes
		WHERE email = ? AND purpose = ? AND created_at > datetime('now', '-60 seconds')
	`, email, purpose).Scan(&count)
	if err != nil {
		return err
	}
	if count > 0 {
		return ErrCodeTooFrequent
	}
	return nil
}
