      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">短视频广场</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">排序：</span>
          <button
            onClick={() => { setSortBy('newest'); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              sortBy === 'newest'
                ? 'bg-sky-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            最新
          </button>
          <button
            onClick={() => { setSortBy('popular'); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              sortBy === 'popular'
                ? 'bg-sky-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            热门
          </button>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-50 flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" opacity="0.3"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">广场暂无视频</h3>
          <p className="text-slate-500 mb-6">成为第一个上传爆款视频的创作者吧！</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {videos.map((video: any) => (
              <div key={video.id} className="relative group">
                <VideoCard
                  video={convertToVideo(video)}
                  onClick={() => goToDetail(video.id)}
                  onDelete={() => {}}
                  showActions={false}
                />
                {/* Collection overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCollect(video.id)
                    }}
                    className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-md hover:bg-sky-500 hover:text-white transition-colors"
                    title="收藏到素材库"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                {/* Collect count badge */}
                {video.collectCount > 0 && (
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-lg backdrop-blur">
                      ♡ {video.collectCount}
                    </span>
                  </div>
                )}
                {/* Tags */}
                {video.tags && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {video.tags.split(',').slice(0, 3).map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>

              <span className="px-4 py-2 text-sm text-slate-500">
                {page} / {pagination.totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {/* Collection Selector Modal */}
      {selectedVideoId !== null && (
        <CollectionSelector
          onConfirm={confirmCollect}
          onCancel={() => setSelectedVideoId(null)}
          isLoading={isCollecting}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}

export default SquarePage
```

- [ ] **Step 2: TypeScript检查**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/SquarePage.tsx
git commit -m "feat(square): add square page component"
```

---

### Task 7: 前端 - 导航栏新增广场Tab

**Files:**
- Modify: `frontend/src/components/Header.tsx`

- [ ] **Step 1: 添加导航链接**

Find where the navigation buttons are (after `{isAuthenticated && user ? (`), add before "素材库" button:

```tsx
              {/* Square */}
              <button
                onClick={() => navigate('/square')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  location.pathname === '/square'
                    ? 'bg-sky-100 text-sky-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                广场
              </button>
```

Need to import `useLocation`:
```tsx
import { useNavigate, useLocation } from 'react-router-dom'
```

- [ ] **Step 2: TypeScript检查**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Header.tsx
git commit -m "feat(square): add square navigation tab to header"
```

---

### Task 8: 前端 - 新增路由

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 导入并添加路由**

Add import:
```tsx
import SquarePage from './pages/SquarePage'
```

Add route inside `Routes` after other authenticated routes:
```tsx
        <Route path="/square" element={
          <ProtectedRoute>
            <SquarePage />
          </ProtectedRoute>
        } />
```

- [ ] **Step 2: TypeScript检查**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(square): add square route"
```

---

### Task 9: 最终验证

**Files:** 全项目

- [ ] **Step 1: 后端编译**

```bash
cd backend && go build -o server
```
Expected: 编译成功

- [ ] **Step 2: 前端类型检查**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 无类型错误

- [ ] **Step 3: 功能验证清单**

确认所有功能：
1. ✅ 顶部导航有"广场"入口，当前页面高亮正确
2. ✅ 广场页面能分页加载所有用户公开的视频
3. ✅ 支持按最新/热门切换排序
4. ✅ 鼠标悬停视频卡片显示收藏按钮
5. ✅ 点击收藏弹出选择收藏夹弹窗
6. ✅ 收藏成功增加计数
7. ✅ 点击封面进入详情页
8. ✅ 数据隔离：原文案对其他用户不可见，新用户需要自己付费提取
9. ✅ 视频标签正确显示

- [ ] **Step 4: 完成**

所有任务完成。

---

## 自我检查 ✅

1. **Spec coverage**：所有需求都有对应任务
   - 数据库迁移 ✓
   - 后端API ✓
   - 前端页面 ✓
   - 导航入口 ✓
   - 路由 ✓
   - 收藏功能 ✓
   - 权限隔离 ✓
   - 排序 ✓
   - 隐私设计 ✓

2. **Placeholders**：所有步骤都有完整代码，没有占位符

3. **Type consistency**：类型命名和现有项目一致，API返回类型匹配前后端

文档完整，可以开始开发。
