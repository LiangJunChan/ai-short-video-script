package database

import (
	"database/sql"
	"errors"
	"time"
)

// User 用户模型
type User struct {
	ID               int        `json:"id"`
	Username         string     `json:"username"`
	PasswordHash     string     `json:"-"`
	UserType         string     `json:"userType"`
	Credits          int        `json:"credits"`
	LastLoginBonusAt *time.Time `json:"lastLoginBonusAt"`
	LastLoginAt      *time.Time `json:"lastLoginAt"`
	CreatedAt        time.Time  `json:"createdAt"`
}

// GetUserByID 根据ID获取用户
func GetUserByID(id int) (*User, error) {
	var u User
	err := DB.QueryRow(`
		SELECT id, username, password_hash, user_type, credits,
		       last_login_bonus_at, last_login_at, created_at
		FROM users WHERE id = ?
	`, id).Scan(
		&u.ID, &u.Username, &u.PasswordHash, &u.UserType, &u.Credits,
		&u.LastLoginBonusAt, &u.LastLoginAt, &u.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &u, nil
}

// GetUserByUsername 根据用户名获取用户
func GetUserByUsername(username string) (*User, error) {
	var u User
	err := DB.QueryRow(`
		SELECT id, username, password_hash, user_type, credits,
		       last_login_bonus_at, last_login_at, created_at
		FROM users WHERE username = ?
	`, username).Scan(
		&u.ID, &u.Username, &u.PasswordHash, &u.UserType, &u.Credits,
		&u.LastLoginBonusAt, &u.LastLoginAt, &u.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &u, nil
}

// CreateUser 创建用户
func CreateUser(username, passwordHash, userType string) (int, error) {
	result, err := DB.Exec(`
		INSERT INTO users (username, password_hash, user_type)
		VALUES (?, ?, ?)
	`, username, passwordHash, userType)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	return int(id), nil
}

// UserExists 检查用户是否存在
func UserExists(username string) (bool, error) {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM users WHERE username = ?", username).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// UpdateUserCredits 更新用户积分（带事务）
func UpdateUserCredits(tx *sql.Tx, userId int, amount int) (int, error) {
	_, err := tx.Exec("UPDATE users SET credits = credits + ? WHERE id = ?", amount, userId)
	if err != nil {
		return 0, err
	}
	var newCredits int
	err = tx.QueryRow("SELECT credits FROM users WHERE id = ?", userId).Scan(&newCredits)
	return newCredits, err
}

// SetLastLogin 更新最后登录时间
func SetLastLogin(tx *sql.Tx, userId int, now time.Time) error {
	_, err := tx.Exec(`
		UPDATE users
		SET last_login_at = ?
		WHERE id = ?
	`, now, userId)
	return err
}

// SetLastLoginBonus 更新最后登录奖励时间
func SetLastLoginBonus(tx *sql.Tx, userId int, now time.Time) error {
	_, err := tx.Exec(`
		UPDATE users
		SET last_login_bonus_at = ?, credits = credits + 50
		WHERE id = ?
	`, now, userId)
	return err
}

// GetUserCredits 获取用户积分
func GetUserCredits(userId int) (int, string, error) {
	var credits int
	var userType string
	err := DB.QueryRow("SELECT credits, user_type FROM users WHERE id = ?", userId).Scan(&credits, &userType)
	return credits, userType, err
}

// CheckinLog 签到记录模型
type CheckinLog struct {
	ID          int       `json:"id"`
	UserID      int       `json:"userId"`
	CheckinDate string    `json:"checkinDate"`
	CreatedAt   time.Time `json:"createdAt"`
}

// GetTodayCheckinStatus 获取今日签到状态
func GetTodayCheckinStatus(userId int) (bool, *time.Time, error) {
	today := time.Now().Format("2006-01-02")
	var lastCheckin CheckinLog
	err := DB.QueryRow(`
		SELECT id, user_id, checkin_date, created_at
		FROM checkin_logs
		WHERE user_id = ? AND checkin_date = ?
	`, userId, today).Scan(&lastCheckin.ID, &lastCheckin.UserID, &lastCheckin.CheckinDate, &lastCheckin.CreatedAt)

	if err == sql.ErrNoRows {
		return false, nil, nil
	}
	if err != nil {
		return false, nil, err
	}
	return true, &lastCheckin.CreatedAt, nil
}

// DoCheckin 执行签到
func DoCheckin(userId int) (int, error) {
	today := time.Now().Format("2006-01-02")

	// 检查今日是否已签到
	exists, _, err := GetTodayCheckinStatus(userId)
	if err != nil {
		return 0, err
	}
	if exists {
		return 0, errors.New("今日已签到")
	}

	// 插入签到记录
	_, err = DB.Exec(`
		INSERT INTO checkin_logs (user_id, checkin_date)
		VALUES (?, ?)
	`, userId, today)
	if err != nil {
		return 0, err
	}

	// 增加20积分
	const checkinBonus = 20
	_, err = DB.Exec("UPDATE users SET credits = credits + ? WHERE id = ?", checkinBonus, userId)
	if err != nil {
		return 0, err
	}

	// 记录积分日志
	var newCredits int
	err = DB.QueryRow("SELECT credits FROM users WHERE id = ?", userId).Scan(&newCredits)
	if err != nil {
		return 0, err
	}

	_, err = DB.Exec(`
		INSERT INTO credit_logs (user_id, action, amount, balance_after)
		VALUES (?, ?, ?, ?)
	`, userId, "checkin", checkinBonus, newCredits)
	if err != nil {
		return 0, err
	}

	return newCredits, nil
}
