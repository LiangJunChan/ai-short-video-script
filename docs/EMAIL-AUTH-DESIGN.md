# 邮箱账号登录技术方案

> **需求背景**：新增邮箱账号注册和登录功能，兼容现有用户名账号和 luka 管理员账号

---

## 一、现状分析

### 1.1 现有登录系统

```
┌─────────────────────────────────────────────────────────────┐
│  现有登录方式                                              │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  用户名 + 密码 登录                                   │ │
│  │  bcrypt 加密 / JWT 认证 / SQLite 存储              │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 现有数据库

```sql
-- users 表
CREATE TABLE users (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    username         VARCHAR(20) UNIQUE NOT NULL,  -- 当前唯一标识
    password_hash    VARCHAR(255) NOT NULL,
    user_type        VARCHAR(20) DEFAULT 'normal',
    credits          INTEGER DEFAULT 0,
    last_login_at    DATETIME,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 现有账号示例
-- username: luka (admin) / username: test (normal)
```

### 1.3 现有 API

| 端点 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/auth/register` | POST | ❌ | 用户名+密码注册 |
| `/api/auth/login` | POST | ❌ | 用户名+密码登录 |
| `/api/auth/me` | GET | ✅ | 获取当前用户信息 |
| `/api/auth/credits` | GET | ✅ | 获取积分和日志 |
| `/api/user/checkin` | POST | ✅ | 每日签到 |

---

## 二、需求分析

### 2.1 核心需求

| 需求 | 说明 |
|------|------|
| 邮箱注册 | 邮箱 + 验证码 + 密码 → 创建账号 |
| 邮箱登录 | 邮箱 + 密码 → 直接登录（不需要验证码） |
| 忘记密码 | 邮箱 + 验证码 + 新密码 → 重置密码 |
| 兼容现有账号 | luka 管理员、test 等现有账号继续可用 |

### 2.2 登录方式矩阵

| 用户类型 | 登录方式 | 说明 |
|---------|---------|------|
| 现有账号（luka, test 等） | 用户名 + 密码 | 完全兼容，无需改动 |
| 新邮箱账号 | 邮箱 + 密码 | 注册时设置密码，后续直接登录 |
| 忘记密码 | 邮箱 + 验证码 + 新密码 | 通过邮箱验证重置 |

### 2.3 使用流程

```
┌──────────────────────────────────────────────────────────────────┐
│                          登录页                                   │
│                                                                   │
│  ┌─────────────────┐           ┌─────────────────┐              │
│  │  用户名登录      │           │  邮箱登录        │              │
│  │  (原有)         │           │  (新增)         │              │
│  └────────┬────────┘           └────────┬────────┘              │
│           │                             │                         │
│           ▼                             ▼                         │
│  ┌─────────────────┐           ┌─────────────────┐              │
│  │ 用户名: luka    │           │ 邮箱: xxx@xx.com │             │
│  │ 密码: ****     │           │ 密码: ****      │              │
│  └────────┬────────┘           └────────┬────────┘              │
│           │                             │                         │
│           │                             │                         │
│           │                             ▼                         │
│           │                   ┌─────────────────┐              │
│           │                   │  忘记密码？      │              │
│           │                   └────────┬────────┘              │
│           │                            │                         │
│           │                            ▼                         │
│           │                   ┌─────────────────┐              │
│           │                   │  邮箱 + 验证码   │              │
│           │                   │  + 新密码        │              │
│           │                   └─────────────────┘              │
└───────────┴───────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────┐
│                         注册流程                                   │
│                                                                   │
│  1. 输入邮箱地址                                                   │
│  2. 发送验证码                                                     │
│  3. 邮箱收到 6 位验证码                                            │
│  4. 输入验证码 + 设置密码 + 确认密码                                 │
│  5. 创建账号（username = 邮箱前缀，email = 邮箱）                    │
│  6. 发放 30 积分，自动登录                                          │
└──────────────────────────────────────────────────────────────────┘
```

### 2.4 兼容性设计

**关键决策：username 仍然作为唯一主键**

```sql
-- 数据库变更
ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE;

-- 示例数据
| id | username      | email              | password_hash | user_type |
|----|---------------|--------------------|--------------|-----------|
| 1  | luka          | NULL               | $2bc...      | admin     |  -- 保留
| 2  | test          | NULL               | $2bc...      | normal    |  -- 保留
| 3  | john2024      | john@email.com     | $2bc...      | normal    |  -- 新账号
```

**兼容策略：**
- 现有账号 `username` 字段不变，`email = NULL`
- 新账号 `username = 邮箱前缀（去特殊字符）`，`email = 完整邮箱`
- 登录时根据输入内容判断：
  - 包含 `@` → 邮箱登录，查 `email` 字段
  - 不包含 `@` → 用户名登录，查 `username` 字段

---

## 三、技术方案

### 3.1 API 设计

#### 3.1.1 发送验证码

```
POST /api/auth/send-code

Request:
{
    "email": "user@example.com",
    "purpose": "register"   // register | reset-password
}

Response:
{
    "code": 200,
    "message": "验证码已发送",
    "data": { "expires_in": 300 }
}

Errors:
- 400: 无效邮箱格式
- 429: 发送过于频繁（60秒内只能发送一次）
- 409: 邮箱已注册（purpose=register时）
```

#### 3.1.2 邮箱注册

```
POST /api/auth/register-by-email

Request:
{
    "email": "user@example.com",
    "code": "123456",
    "password": "password123",
    "confirm_password": "password123"
}

Response:
{
    "code": 200,
    "message": "注册成功",
    "data": {
        "token": "eyJhbG...",
        "user": {
            "id": 3,
            "username": "user",
            "email": "user@example.com",
            "credits": 30
        }
    }
}

Errors:
- 400: 验证码错误或已过期
- 400: 两次密码不一致
- 400: 密码格式不符合要求（至少6位）
- 409: 邮箱已被注册
```

#### 3.1.3 邮箱登录

```
POST /api/auth/login-by-email

Request:
{
    "email": "user@example.com",
    "password": "password123"
}

Response:
{
    "code": 200,
    "message": "登录成功",
    "data": {
        "token": "eyJhbG...",
        "user": {
            "id": 3,
            "username": "user",
            "email": "user@example.com",
            "credits": 30
        }
    }
}

Errors:
- 400: 邮箱或密码错误
- 404: 该邮箱尚未注册
```

#### 3.1.4 重置密码

```
POST /api/auth/reset-password

Request:
{
    "email": "user@example.com",
    "code": "123456",
    "password": "newpassword123",
    "confirm_password": "newpassword123"
}

Response:
{
    "code": 200,
    "message": "密码重置成功，请使用新密码登录"
}

Errors:
- 400: 验证码错误或已过期
- 400: 两次密码不一致
- 400: 密码格式不符合要求
- 404: 该邮箱尚未注册
```

### 3.2 数据库变更

```sql
-- 新增 email 字段（UNIQUE，允许 NULL）
ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE;

-- 现有数据 email 默认为 NULL，不影响现有账号

-- 新增验证码表
CREATE TABLE email_codes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    email           VARCHAR(255) NOT NULL,
    code            VARCHAR(6) NOT NULL,
    purpose         VARCHAR(20) NOT NULL,  -- 'register' | 'reset-password'
    expires_at      DATETIME NOT NULL,
    error_count     INTEGER DEFAULT 0,      -- 连续错误次数
    locked_until    DATETIME,               -- 锁定截止时间
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX idx_email_codes_email ON email_codes(email);
CREATE INDEX idx_email_codes_expires ON email_codes(expires_at);
```

### 3.2.1 过期验证码清理机制

**采用"插入时顺便清理"策略，无需定时任务：**

```go
// 保存验证码前，先删除该邮箱已过期的旧验证码
func SaveCode(email, code, purpose string) error {
    now := time.Now()
    expiresAt := now.Add(5 * time.Minute)
    
    // 1. 删除该邮箱已过期的旧验证码
    db.Exec(`DELETE FROM email_codes 
              WHERE email = ? AND expires_at < ?`, email, now)
    
    // 2. 插入新验证码（5分钟过期）
    _, err := db.Exec(`
        INSERT INTO email_codes (email, code, purpose, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
    `, email, code, purpose, expiresAt, now)
    
    return err
}
```

**优点：**
- 插入时顺便清理，不积累过期数据
- 无需定时任务，不增加系统复杂度
- 与现有SQLite架构一致

### 3.3 username 生成规则

```go
func GenerateUsername(email string) string {
    // 取邮箱 @ 前面的部分
    username := strings.Split(email, "@")[0]
    
    // 去除特殊字符，只保留字母数字和下划线
    reg := regexp.MustCompile(`[^a-zA-Z0-9_]`)
    username = reg.ReplaceAllString(username, "")
    
    // 如果为空，使用默认前缀
    if username == "" {
        username = "user"
    }
    
    // 限制长度 3-20
    if len(username) > 20 {
        username = username[:20]
    }
    
    // 检查是否已存在，如存在则追加数字
    // 例如: user 已存在 → user1, user2 ...
    return username
}

// 示例
// john@gmail.com → john
// john.doe@qq.com → johndoe
// 123@test.com → user_123 (数字开头加前缀)
```

### 3.4 登录入口判断逻辑

```go
func DetectLoginType(input string) string {
    if strings.Contains(input, "@") {
        return "email"
    }
    return "username"
}

// 登录处理
func HandleLogin(c *gin.Context) {
    identifier := c.PostForm("identifier")  // 用户名或邮箱
    
    if DetectLoginType(identifier) == "email" {
        // 邮箱登录
        var req struct {
            Email    string `json:"email" binding:"required,email"`
            Password string `json:"password" binding:"required"`
        }
        // ... 邮箱登录逻辑
    } else {
        // 用户名登录（兼容现有）
        var req struct {
            Username string `json:"username" binding:"required"`
            Password string `json:"password" binding:"required"`
        }
        // ... 用户名登录逻辑
    }
}
```

---

## 四、前端设计

### 4.1 登录页改造

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                     AI短视频脚本平台                             │
│                      登录到您的账户                             │
│                                                                │
│   ┌──────────────────────┬──────────────────────┐            │
│   │   👤 用户名登录      │   📧 邮箱登录        │            │
│   └──────────────────────┴──────────────────────┘            │
│                                                                │
│   ═══════════════════ 邮箱登录 ════════════════════             │
│                                                                │
│   ┌──────────────────────────────────────────────┐           │
│   │  📧  邮箱地址                                │           │
│   └──────────────────────────────────────────────┘           │
│                                                                │
│   ┌──────────────────────────────────────────────┐           │
│   │  🔒  密码                                    │           │
│   └──────────────────────────────────────────────┘           │
│                                                                │
│   ┌──────────────────────────────────────────────┐           │
│   │  <a> 忘记密码？</a>                          │           │
│   └──────────────────────────────────────────────┘           │
│                                                                │
│   [                      登录                      ]            │
│                                                                │
│   还没有账户？ <a>立即注册</a>                                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 注册页

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                        创建账户                                  │
│                   开始使用AI短视频脚本平台                        │
│                                                                │
│   ┌──────────────────────────────────────────────┐           │
│   │  📧  邮箱地址                                │           │
│   └──────────────────────────────────────────────┘           │
│                                                                │
│   ┌──────────────────┬──────────────────────────┐           │
│   │  123456          │     发送验证码            │           │
│   └──────────────────┴──────────────────────────┘           │
│                                                                │
│   ┌──────────────────────────────────────────────┐           │
│   │  🔐  设置密码（至少6位）                      │           │
│   └──────────────────────────────────────────────┘           │
│                                                                │
│   ┌──────────────────────────────────────────────┐           │
│   │  🔐  确认密码                                │           │
│   └──────────────────────────────────────────────┘           │
│                                                                │
│   [                      注册                      ]            │
│                                                                │
│   已有账户？ <a>立即登录</a>                                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4.3 忘记密码页

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                        找回密码                                  │
│                                                                │
│   ┌──────────────────────────────────────────────┐           │
│   │  📧  注册邮箱                                │           │
│   └──────────────────────────────────────────────┘           │
│                                                                │
│   ┌──────────────────┬──────────────────────────┐           │
│   │  123456          │     发送验证码            │           │
│   └──────────────────┴──────────────────────────┘           │
│                                                                │
│   ┌──────────────────────────────────────────────┐           │
│   │  🔐  新密码（至少6位）                        │           │
│   └──────────────────────────────────────────────┘           │
│                                                                │
│   ┌──────────────────────────────────────────────┐           │
│   │  🔐  确认新密码                              │           │
│   └──────────────────────────────────────────────┘           │
│                                                                │
│   [                    重置密码                    ]            │
│                                                                │
│   想起密码了？ <a>返回登录</a>                                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4.4 路由设计

```typescript
// App.tsx
const App = () => (
  <Routes>
    {/* 现有路由 */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/profile" element={<ProfilePage />} />
    {/* 新增 */}
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
  </Routes>
);
```

---

## 五、安全策略

### 5.1 防刷机制

| 策略 | 限制 |
|------|------|
| 发送频率 | 同一邮箱 60 秒只能发送一次 |
| 验证码时效 | 5 分钟过期 |
| 错误次数 | 连续 5 次错误，锁定 10 分钟 |
| 每日上限 | 同一 IP 每天最多发送 20 次 |

### 5.2 密码安全

| 策略 | 要求 |
|------|------|
| 最小长度 | 6 位 |
| 加密方式 | bcrypt (12 轮) |

### 5.3 邮箱唯一性

- 每个邮箱只能注册一个账号
- 邮箱注册后可用于登录
- 现有 username 账号不受影响

---

## 六、测试用例

### 6.1 功能测试

| 测试用例 | 预期结果 |
|---------|---------|
| 邮箱注册 - 正常 | 创建账号，username=邮箱前缀，发放30积分 |
| 邮箱注册 - 已注册邮箱 | 提示"邮箱已被注册" |
| 邮箱注册 - 密码不一致 | 提示"两次密码不一致" |
| 邮箱登录 - 正常 | 登录成功，返回JWT |
| 邮箱登录 - 密码错误 | 提示"邮箱或密码错误" |
| 邮箱登录 - 未注册邮箱 | 提示"该邮箱尚未注册" |
| 用户名登录 - luka | 兼容现有逻辑，登录成功 |
| 用户名登录 - test | 兼容现有逻辑，登录成功 |
| 忘记密码 - 正常 | 密码重置成功 |
| 忘记密码 - 未注册邮箱 | 提示"该邮箱尚未注册" |

### 6.2 边界测试

| 测试用例 | 预期结果 |
|---------|---------|
| 用户名含特殊字符的邮箱 (john.doe@xx.com) | username = "johndoe" |
| 纯数字开头邮箱 (123@xx.com) | username = "user_123" |
| 超长邮箱 | username 截取前20位 |

---

## 七、实施计划

| 阶段 | 内容 | 工时 |
|------|------|------|
| **Phase 1** | 数据库变更（新增字段和表） | 1h |
| **Phase 2** | 后端 API 开发 | 4h |
| **Phase 3** | 前端页面开发 | 4h |
| **Phase 4** | 测试与修复 | 3h |
| **总计** | | **12h** |

---

## 八、附录

### 8.1 环境变量

```bash
# .env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your-email@qq.com
SMTP_PASS=your-authorization-code
EMAIL_FROM=AI短视频脚本平台 <your-email@qq.com>
```

### 8.2 依赖

```bash
go get github.com/jordan-wright/email
```
