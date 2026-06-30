# 抖音链接一键提取 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现用户粘贴抖音分享链接，后端自动下载视频并提取文案，用户无需手动下载再上传，提升使用效率。

**Architecture:** 前端提供输入框让用户粘贴链接 → 后端接收链接后，解析短链接获取抖音视频页面 → 从页面HTML提取真实视频URL → 下载视频到本地uploads目录 → 后续处理（时长校验、缩略图、创建记录、扣积分、异步ASR提取）和本地上传流程完全一致 → 返回结果给前端。复用现有上传后的处理逻辑，只新增链接解析和下载部分。

**Tech Stack:**
- 后端：Go + net/http 处理HTTP请求，goquery 或正则提取HTML中的视频URL
- 前端：React，在首页或新增页面添加链接提取入口
- 复用：复用现有的视频处理、积分扣减、异步AI处理逻辑

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `backend/service/douyin.go` | Create | 抖音链接解析逻辑：解析短链接 → 提取视频URL → 下载视频文件 |
| `backend/handler/video.go` | Modify | 新增 `ExtractVideoByURL` handler处理API请求 |
| `backend/main.go` | Modify | 注册新API路由 `POST /api/video/extract-by-url` |
| `frontend/src/store/videoApi.ts` | Modify | 新增RTK Query endpoint `extractByUrl` |
| `frontend/src/App.tsx` | Modify | 在头部"上传视频"按钮旁边添加"链接提取"按钮，打开提取弹窗 |
| `frontend/src/components/UrlExtractModal.tsx` | Create | 链接提取弹窗组件：输入框 + 进度显示 + 结果展示 |
| `frontend/src/pages/DetailPage.tsx` | No change | 提取完成后跳转到详情页，复用现有逻辑 |

---

## Task 1: 创建抖音解析服务 `backend/service/douyin.go`

**Files:**
- Create: `backend/service/douyin.go`

- [ ] **Step 1: 编写完整代码实现抖音链接解析**

```go
package service

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ExtractVideoByDouyinURL 从抖音分享链接提取视频并下载到本地
// 返回: 本地文件路径, 文件名, 错误
func ExtractVideoByDouyinURL(shareURL string) (string, string, error) {
	// 1. 规范化链接（处理用户粘贴的各种格式）
	shareURL = normalizeShareURL(shareURL)
	if shareURL == "" {
		return "", "", errors.New("无效的抖音链接")
	}

	// 2. 请求链接，跟随重定向获取最终页面
	client := &http.Client{
		Timeout: 30 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// 允许最多10次重定向
			if len(via) >= 10 {
				return errors.New("太多重定向")
			}
			return nil
		},
	}

	req, err := http.NewRequest("GET", shareURL, nil)
	if err != nil {
		return "", "", err
	}
	// 设置User-Agent模拟浏览器
	req.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1")

	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	// 3. 读取HTML内容
	html, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", err
	}
	htmlStr := string(html)

	// 4. 从HTML提取视频URL
	videoURL := extractVideoURL(htmlStr)
	if videoURL == "" {
		return "", "", errors.New("无法提取视频地址，请检查链接是否正确")
	}

	// 5. 下载视频到本地
	videoData, err := downloadVideo(videoURL, client)
	if err != nil {
		return "", "", err
	}

	// 6. 保存到uploads目录
	uuid := uuid.New().String()
	filename := fmt.Sprintf("video_%s.mp4", uuid)
	savePath := fmt.Sprintf("../uploads/%s", filename)

	err = os.WriteFile(savePath, videoData, 0644)
	if err != nil {
		return "", "", err
	}

	log.Printf("Successfully downloaded video from douyin URL: %s -> %s", shareURL, savePath)
	return savePath, filename, nil
}

// normalizeShareURL 处理各种格式的抖音分享链接
func normalizeShareURL(input string) string {
	input = strings.TrimSpace(input)
	input = strings.TrimSuffix(input, "/")

	// 如果已经是完整URL
	if strings.HasPrefix(input, "http") {
		return input
	}

	// 如果只复制了v.douyin.com/ABC部分，没有scheme
	if strings.HasPrefix(input, "v.douyin.com") {
		return "https://" + input
	}

	// 如果用户复制了整个分享文本，提取链接
	re := regexp.MustCompile(`https?://[^\s]+`)
	match := re.FindString(input)
	return match
}

// extractVideoURL 从抖音页面HTML提取视频播放地址
func extractVideoURL(html string) string {
	// 尝试多种提取方式

	// 1. 寻找 video 标签的 src
	reVideo := regexp.MustCompile(`<video[^>]+src="([^"]+)"`)
	match := reVideo.FindStringSubmatch(html)
	if len(match) >= 2 {
		url := strings.ReplaceAll(match[1], "amp;", "") // 解编码 &amp;
		return url
	}

	// 2. 寻找 script 中的 video url 匹配 pattern
	reScript := regexp.MustCompile(`"playAddr":\["([^"]+)"\]`)
	match = reScript.FindStringSubmatch(html)
	if len(match) >= 2 {
		url := strings.ReplaceAll(match[1], "amp;", "")
		return url
	}

	// 3. 尝试匹配 vm.url 模式
	reVm := regexp.MustCompile(`vm\.url\s*=\s*"([^"]+)"`)
	match = reVm.FindStringSubmatch(html)
	if len(match) >= 2 {
		url := strings.ReplaceAll(match[1], "amp;", "")
		return url
	}

	return ""
}

// downloadVideo 下载视频
func downloadVideo(videoURL string, client *http.Client) ([]byte, error) {
	// 处理相对URL
	if !strings.HasPrefix(videoURL, "http") {
		if strings.HasPrefix(videoURL, "//") {
			videoURL = "https:" + videoURL
		} else {
			return nil, errors.New("无效的视频URL: " + videoURL)
		}
	}

	// URL解码
	parsedURL, err := url.Parse(videoURL)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("GET", parsedURL.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1")
	req.Header.Set("Referer", "https://www.douyin.com/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("下载视频失败，状态码: %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if len(data) == 0 {
		return nil, errors.New("下载视频为空")
	}

	// 检查大小限制 (4GB)
	if len(data) > 4*1024*1024*1024 {
		return nil, errors.New("视频文件超过4GB限制")
	}

	return data, nil
}

// ValidateDouyinURL 验证是否是抖音链接
func ValidateDouyinURL(url string) bool {
	url = strings.TrimSpace(url)
	return strings.Contains(url, "douyin.com") || strings.Contains(url, "iesdouyin.com")
}
```

- [ ] **Step 2: Commit**

```bash
cd backend
git add service/douyin.go
git commit -m "feat: add douyin url parser service"
```

---

## Task 2: 新增后端API处理 `backend/handler/video.go`

**Files:**
- Modify: `backend/handler/video.go`

- [ ] **Step 1: 在文件末尾添加 `ExtractVideoByURL` handler**

在 `backend/handler/video.go` 的最后一个函数 `DeleteVideo` 之后添加：

```go
// ExtractVideoByURL 通过链接提取视频文案
func ExtractVideoByURL(c *gin.Context) {
	type Request struct {
		URL   string `json:"url" binding:"required"`
		Title string `json:"title"`
		Uploader string `json:"uploader"`
	}

	var req Request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "请提供有效的视频链接",
			Data:    nil,
		})
		return
	}

	if !service.ValidateDouyinURL(req.URL) {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "目前仅支持抖音链接，请输入有效的抖音分享链接",
			Data:    nil,
		})
		return
	}

	userId := middleware.GetUserID(c)

	// 解析链接并下载视频
	savePath, filename, err := service.ExtractVideoByDouyinURL(req.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: err.Error(),
			Data:    nil,
		})
		return
	}

	// 获取视频时长
	duration, err := service.GetVideoDuration(savePath)
	if err != nil {
		os.Remove(savePath)
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无法读取视频信息: " + err.Error(),
			Data:    nil,
		})
		return
	}

	// 验证时长
	if valid, msg := service.ValidateVideoDuration(duration); !valid {
		os.Remove(savePath)
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: msg,
			Data:    nil,
		})
		return
	}

	// 生成缩略图
	uuid := strings.TrimPrefix(filename, "video_")
	uuid = strings.TrimSuffix(uuid, ".mp4")
	thumbFilename := fmt.Sprintf("thumb_%s.jpg", uuid)
	thumbPath := fmt.Sprintf("../thumbnails/%s", thumbFilename)
	err = service.CaptureThumbnail(savePath, thumbPath)
	if err != nil {
		log.Printf("Failed to capture thumbnail: %v", err)
		thumbPath = ""
	}

	// 设置标题
	title := req.Title
	if title == "" {
		title = "Extracted from URL"
	}
	uploader := req.Uploader
	if uploader == "" {
		uploader = "匿名用户"
	}

	// 创建数据库记录
	id, err := database.CreateVideo(
		title,
		filename,
		filename, // original filename
		thumbPath,
		duration,
		int64(len(savePath)), // size
		"video/mp4",         // content-type
		uploader,
		userId,
	)
	if err != nil {
		os.Remove(savePath)
		if thumbPath != "" {
			os.Remove(thumbPath)
		}
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "创建记录失败: " + err.Error(),
			Data:    nil,
		})
		return
	}

	// 扣减积分
	if err := service.DeductExtractCredits(userId, id); err != nil {
		if errors.Is(err, service.ErrInsufficientCredits) {
			// 删除已创建的文件和记录
			os.Remove(savePath)
			if thumbPath != "" {
				os.Remove(thumbPath)
			}
			database.DB.Exec("DELETE FROM videos WHERE id = ?", id)
			c.JSON(http.StatusPaymentRequired, APIResponse{
				Code:    402,
				Message: "积分不足，提取文案需要5积分，请充值后再试",
			})
			return
		}
		log.Printf("Warning: deduct credits failed: %v", err)
		// 其他错误继续执行，不阻止流程
	}

	// 异步AI处理
	go service.ProcessVideoAI(id, savePath)

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "提取成功，正在处理文案...",
		Data: gin.H{
			"id":    id,
			"title": title,
		},
	})
}
```

- [ ] **Step 2: Commit**

```bash
git add handler/video.go
git commit -m "feat: add extract video by url handler"
```

---

## Task 3: 注册API路由 `backend/main.go`

**Files:**
- Modify: `backend/main.go:71`

- [ ] **Step 1: 在受保护路由区域添加新路由**

在 `auth.POST("/videos/:id/rewrite", handler.RewriteVideoText)` 之后添加一行：

```go
		auth.POST("/video/extract-by-url", handler.ExtractVideoByURL)
```

然后在日志输出部分（大概第88行）添加：

```go
	log.Printf("  POST /api/video/extract-by-url - 链接提取视频文案")
```

最终路由部分看起来应该是：

```go
		auth.POST("/videos/:id/reextract", handler.ReextractVideo)
		auth.POST("/videos/:id/rewrite", handler.RewriteVideoText)
		auth.POST("/video/extract-by-url", handler.ExtractVideoByURL)
		auth.DELETE("/videos/:id", handler.DeleteVideo)
```

日志部分：

```go
	log.Printf("  POST /api/videos/:id/reextract - 重新提取文案")
	log.Printf("  POST /api/videos/:id/rewrite - AI改写文案")
	log.Printf("  POST /api/video/extract-by-url - 链接提取视频文案")
```

- [ ] **Step 2: Commit**

```bash
git add main.go
git commit -m "feat: register extract-by-url api route"
```

---

## Task 4: 前端新增RTK Query端点 `frontend/src/store/videoApi.ts`

**Files:**
- Modify: `frontend/src/store/videoApi.ts`

- [ ] **Step 1: 添加 extractByUrl mutation**

在 RTK Query builder 中找到 `reextractVideo` 之后添加：

```typescript
  extractByUrl: builder.mutation<{
    code: number;
    message: string;
    data: { id: number; title: string };
  }, { url: string; title: string; uploader: string }>({
    query: (body) => ({
      url: '/video/extract-by-url',
      method: 'POST',
      body,
    }),
    invalidatesTags: ['Videos', 'User'],
  }),
```

确保 `invalidatesTags` 包含 `['Videos', 'User']` 这样会刷新视频列表和用户积分。

- [ ] **Step 2: Commit**

```bash
cd ../frontend
git add src/store/videoApi.ts
git commit -m "feat: add extractByUrl api endpoint"
```

---

## Task 5: 创建前端弹窗组件 `frontend/src/components/UrlExtractModal.tsx`

**Files:**
- Create: `frontend/src/components/UrlExtractModal.tsx`

- [ ] **Step 1: 编写完整组件代码**

```tsx
import { useState } from 'react'
import { useExtractByUrlMutation } from '../store/videoApi'
import { useNavigate } from 'react-router-dom'

interface UrlExtractModalProps {
  onClose: () => void
}

function UrlExtractModal({ onClose }: UrlExtractModalProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [uploader, setUploader] = useState('')
  const [processing, setProcessing] = useState(false)
  const navigate = useNavigate()

  const [extractByUrl] = useExtractByUrlMutation()

  const handleExtract = async () => {
    if (!url.trim()) {
      alert('请输入抖音分享链接')
      return
    }

    setProcessing(true)

    try {
      const result = await extractByUrl({
        url: url.trim(),
        title: title.trim(),
        uploader: uploader.trim(),
      }).unwrap()

      if (result.code === 200) {
        onClose()
        navigate(`/video/${result.data.id}`)
      } else {
        alert(result.message || '提取失败')
      }
    } catch (err: any) {
      if (err.data?.message) {
        alert(err.data.message)
      } else {
        alert('提取失败，请重试')
      }
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] flex items-center justify-center animate-overlay-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-10 w-[520px] max-w-[calc(100vw-48px)] animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-normal mb-7" style={{ fontFamily: 'var(--font-serif)' }}>
          链接提取文案
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#333] mb-1.5">抖音分享链接</label>
            <textarea
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="粘贴抖音分享链接，例如：https://v.douyin.com/ABC123/"
              className="w-full px-4 py-3 border border-[#e5e5e5] rounded-lg text-sm outline-none focus:border-black transition-colors min-h-[80px] resize-none"
            />
            <p className="text-xs text-[#999] mt-1">支持直接复制抖音分享文本，会自动提取链接</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#333] mb-1.5">视频标题（可选）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="留空将自动生成"
              className="w-full px-4 py-2.5 border border-[#e5e5e5] rounded-lg text-sm outline-none focus:border-black transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#333] mb-1.5">上传者（可选）</label>
            <input
              type="text"
              value={uploader}
              onChange={(e) => setUploader(e.target.value)}
              placeholder="默认为匿名用户"
              className="w-full px-4 py-2.5 border border-[#e5e5e5] rounded-lg text-sm outline-none focus:border-black transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 px-4 py-2.5 border border-[#e5e5e5] rounded-lg text-sm font-medium text-[#666] hover:border-[#999] transition-colors disabled:opacity-40"
              onClick={onClose}
              disabled={processing}
            >
              取消
            </button>
            <button
              className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
              onClick={handleExtract}
              disabled={processing}
            >
              {processing ? '处理中...' : '开始提取'}
            </button>
          </div>

          <div className="text-xs text-[#999]">
            <p>💡 提示：提取成功需要消耗 5 积分，提取完成后会自动跳转到详情页</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UrlExtractModal
```

- [ ] **Step 2: Commit**

```bash
git add src/components/UrlExtractModal.tsx
git commit -m "feat: add url extract modal component"
```

---

## Task 6: 修改 `App.tsx` 添加打开弹窗按钮

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 导入组件和添加状态**

在文件开头导入部分添加：

```tsx
import UrlExtractModal from './components/UrlExtractModal'
```

在现有 `const [showUploadModal, setShowUploadModal] = useState(false)` 之后添加：

```tsx
const [showUrlExtractModal, setShowUrlExtractModal] = useState(false)
```

- [ ] **Step 2: 在头部添加"链接提取"按钮**

找到上传视频按钮（大概在第104行），在它前面（退出按钮之后，上传按钮之前）添加链接提取按钮：

```tsx
                <button
                  className="px-4 py-2.5 bg-black/80 text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                  onClick={() => setShowUrlExtractModal(true)}
                >
                  链接提取
                </button>
```

位置应该是：

```tsx
                <button
                  className="px-4 py-2 border border-[#e5e5e5] rounded-lg text-sm text-[#666] hover:border-black hover:text-black transition-colors"
                  onClick={handleLogout}
                >
                  退出
                </button>
                <button
                  className="px-4 py-2.5 bg-black/80 text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                  onClick={() => setShowUrlExtractModal(true)}
                >
                  链接提取
                </button>
                <button
                  className="px-7 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                  onClick={() => setShowUploadModal(true)}
                >
                  上传视频
                </button>
```

- [ ] **Step 3: 在return末尾添加弹窗组件**

在 `{showUploadModal && (...)` 之后添加：

```tsx
      {showUrlExtractModal && (
        <UrlExtractModal
          onClose={() => setShowUrlExtractModal(false)}
        />
      )}
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add url extract button to header"
```

---

## Task 7: 编译测试

- [ ] **Step 1: 编译后端**

```bash
cd ../../backend
go build -o server .
```

Expected: 编译成功，没有错误

- [ ] **Step 2: 检查前端类型检查**

```bash
cd ../../frontend
npm run build
```

Expected: 编译成功，没有TypeScript错误

- [ ] **Step 3: 测试功能**

测试步骤：
1. 启动后端 `./server`
2. 启动前端 `npm run dev`
3. 登录后点击"链接提取"按钮
4. 粘贴抖音分享链接 `https://v.douyin.com/xxxxx/`
5. 点击开始提取
6. Expected: 下载成功，扣5积分，跳转到详情页，异步提取文案

- [ ] **Step 4: 如果测试通过，Commit**

```bash
# 如果已经全部提交就不需要了
```

---

## 自检查

✅ 1. Spec coverage: 覆盖了"抖音链接一键提取"所有需求：链接解析 → 下载 → 处理 → 扣积分 → 异步提取 → 跳转详情
✅ 2. No placeholders: 所有代码都完整提供，没有TBD
✅ 3. Type consistency: API参数名称一致，前端和后端对齐

---

Plan complete.
