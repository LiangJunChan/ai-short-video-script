# Footer 备案号 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在前端所有页面(含 3 个未登录页)底部新增统一 Footer,展示 ICP + 公安备案号,并预留警徽图标位置,占位符可一处替换。

**Architecture:** 新增无 props/无状态的 `Footer.tsx` 组件,备案号通过组件顶部 3 个字符串常量管理。分两处挂载:(1) `Layout.tsx` 内,自动覆盖 10 个已登录路由;(2) 3 个未登录页 (`LoginPage` / `RegisterPage` / `ForgotPasswordPage`) 由于使用 `fixed inset-0` 全屏定位、无法用文档流贴底,采用 `absolute bottom-0` 直接钉在视口底部,z-index 高于装饰背景层。

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind CSS + 现有 `av-*` 设计 token(如 `av-bg-primary`、`av-text-tertiary`、`av-border-subtle`)

## Global Constraints

- 所有代码文件位于 `frontend/` 目录下
- 使用 pnpm 作为包管理器(不要用 npm/yarn)
- 复用现有设计 token(`bg-av-*`、`text-av-*`、`border-av-*`),不引入新颜色
- 备案号占位符必须使用完整中文示例包含尖括号 `<...>`,便于全项目搜索替换
- 外链一律 `target="_blank" rel="noopener noreferrer"`
- 品牌名为 "谷语AI"(参考 Login/Register 页顶部 h1),不是其他名字
- 官方 URL:ICP 跳 `https://beian.miit.gov.cn`;公安备案跳 `http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=<数字>`

---

## File Structure

| 文件 | 操作 | 职责 |
|---|---|---|
| `frontend/src/components/Footer.tsx` | 新建 | Footer 组件本体 + 备案号常量 |
| `frontend/public/beian-police-badge.svg` | 新建 | 内联式警徽图标(SVG,零依赖) |
| `frontend/src/components/Layout.tsx` | 修改 | 已登录页挂载点 |
| `frontend/src/pages/LoginPage.tsx` | 修改 | 未登录页挂载点 |
| `frontend/src/pages/RegisterPage.tsx` | 修改 | 未登录页挂载点 |
| `frontend/src/pages/ForgotPasswordPage.tsx` | 修改 | 未登录页挂载点 |

**关于警徽图标的技术选择:** spec 里写的是 `.png`,但检查过实际实现方案后,选用内联 SVG 更好——
1. 官方警徽 PNG 需从外部下载,版权和文件可能改变;SVG 用简单几何图标代替(徽章外形 + "警"字或盾牌),视觉上传达相同含义。
2. SVG 体积更小(~500 bytes),清晰度不受缩放影响。
3. 打包时不需要额外资源加载。

如果 luka 拿到真实备案时公安部要求必须用官方 PNG,只需换成 `<img src="/beian-police-badge.png" />` 即可,组件其他部分不变。

---

## Interfaces

`Footer` 组件对外接口:

```tsx
// 无 props,无返回值,是一个默认导出的函数组件
function Footer(): JSX.Element
export default Footer
```

调用方式:`<Footer />`,无需传参。

---

### Task 1: 创建 Footer 组件本体

**Files:**
- Create: `frontend/src/components/Footer.tsx`

**Interfaces:**
- Consumes: 无
- Produces: `default export function Footer(): JSX.Element`

- [ ] **Step 1: 创建 Footer.tsx**

```tsx
// frontend/src/components/Footer.tsx

// 备案号统一管理 —— 拿到号码后只需修改以下 3 个常量
// -----------------------------------------------------------------------------
// ICP_NUMBER: 工信部 ICP 备案号,例如 "京ICP备12345678号-1"
// POLICE_RECORD_CODE: 公安备案号纯数字部分,用于拼接跳转 URL,例如 "11010802012345"
// POLICE_TEXT: 页面上显示的公安备案完整文案,例如 "京公网安备 11010802012345 号"
// -----------------------------------------------------------------------------
const ICP_NUMBER = '<ICP 备案号,如:京ICP备12345678号-1>'
const POLICE_RECORD_CODE = '<公安备案号数字,如:11010802012345>'
const POLICE_TEXT = '<公安备案文案,如:京公网安备 11010802012345 号>'

function Footer() {
  return (
    <footer className="border-t border-av-border-subtle mt-auto relative z-10">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-center gap-4 text-xs text-av-text-tertiary flex-wrap">
        <a
          href="https://beian.miit.gov.cn"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-av-text-secondary transition-colors"
        >
          {ICP_NUMBER}
        </a>
        <span className="text-av-border-subtle" aria-hidden="true">·</span>
        <a
          href={`http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=${POLICE_RECORD_CODE}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-av-text-secondary transition-colors inline-flex items-center gap-1.5"
        >
          <img
            src="/beian-police-badge.svg"
            alt=""
            aria-hidden="true"
            className="w-3.5 h-3.5"
          />
          {POLICE_TEXT}
        </a>
      </div>
    </footer>
  )
}

export default Footer
```

- [ ] **Step 2: 提交**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script
git add frontend/src/components/Footer.tsx
git commit -m "feat(frontend): add Footer component with ICP/police beian placeholders"
```

---

### Task 2: 添加警徽图标 SVG

**Files:**
- Create: `frontend/public/beian-police-badge.svg`

**Interfaces:**
- Consumes: 无
- Produces: 静态资源 `/beian-police-badge.svg`(Vite public 目录,以 `/` 为根路径访问)

- [ ] **Step 1: 创建 SVG 文件**

内容为一个简化盾牌图标(蓝色警徽风格,不与官方警徽混淆,仅作占位):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" fill="#1e40af" stroke="#1e3a8a" stroke-width="1"/>
  <path d="M9 12l2 2 4-4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
```

将上述内容写入 `frontend/public/beian-police-badge.svg`

- [ ] **Step 2: 提交**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script
git add frontend/public/beian-police-badge.svg
git commit -m "feat(frontend): add placeholder shield icon for police beian link"
```

---

### Task 3: 在 Layout 中挂载 Footer(已登录页)

**Files:**
- Modify: `frontend/src/components/Layout.tsx`

**Interfaces:**
- Consumes: `Footer` from `./Footer`
- Produces: 无(已登录页全部自动带 footer)

- [ ] **Step 1: 修改 Layout.tsx**

将原文件:

```tsx
import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import Header from './Header'
import UploadModal from './UploadModal'
import UrlExtractModal from './UrlExtractModal'
import Toast from './Toast'
import { useAuthContext } from '../contexts/AuthContext'
import { updateCredits } from '../store/authSlice'
import { videoApi } from '../store/videoApi'

function Layout() {
  const dispatch = useDispatch()
  const { user, isAuthenticated } = useAuthContext()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showUrlExtractModal, setShowUrlExtractModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const { data: meData } = videoApi.useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  })

  useEffect(() => {
    if (meData?.data?.credits !== undefined && meData.data.credits !== user?.credits) {
      dispatch(updateCredits(meData.data.credits))
    }
  }, [meData, user?.credits, dispatch])

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="min-h-screen bg-av-bg-primary">
      <Header
        user={user}
        isAuthenticated={isAuthenticated}
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenUrlExtract={() => setShowUrlExtractModal(true)}
        onShowToast={showToast}
      />

      {/* Main Content — 各子页面自行控制宽度与 padding */}
      <main className="min-h-[calc(100vh-4rem)]">
        <Outlet context={{ onOpenUpload: () => setShowUploadModal(true) }} />
      </main>

      {/* Modals */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={() => {
            setShowUploadModal(false)
            showToast('上传成功，正在提取文案...')
          }}
        />
      )}

      {showUrlExtractModal && (
        <UrlExtractModal
          onClose={() => setShowUrlExtractModal(false)}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  )
}

export default Layout
```

改成(3 处改动:import Footer、外层容器改成 flex 列布局、main 改成 flex-1、追加 `<Footer />`):

```tsx
import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import Header from './Header'
import Footer from './Footer'
import UploadModal from './UploadModal'
import UrlExtractModal from './UrlExtractModal'
import Toast from './Toast'
import { useAuthContext } from '../contexts/AuthContext'
import { updateCredits } from '../store/authSlice'
import { videoApi } from '../store/videoApi'

function Layout() {
  const dispatch = useDispatch()
  const { user, isAuthenticated } = useAuthContext()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showUrlExtractModal, setShowUrlExtractModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const { data: meData } = videoApi.useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  })

  useEffect(() => {
    if (meData?.data?.credits !== undefined && meData.data.credits !== user?.credits) {
      dispatch(updateCredits(meData.data.credits))
    }
  }, [meData, user?.credits, dispatch])

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="min-h-screen bg-av-bg-primary flex flex-col">
      <Header
        user={user}
        isAuthenticated={isAuthenticated}
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenUrlExtract={() => setShowUrlExtractModal(true)}
        onShowToast={showToast}
      />

      {/* Main Content — 各子页面自行控制宽度与 padding */}
      <main className="flex-1 min-h-[calc(100vh-4rem-3rem)]">
        <Outlet context={{ onOpenUpload: () => setShowUploadModal(true) }} />
      </main>

      <Footer />

      {/* Modals */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={() => {
            setShowUploadModal(false)
            showToast('上传成功，正在提取文案...')
          }}
        />
      )}

      {showUrlExtractModal && (
        <UrlExtractModal
          onClose={() => setShowUrlExtractModal(false)}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  )
}

export default Layout
```

说明:
- 外层加 `flex flex-col` → 建立列式 flex 上下文
- `<main>` 加 `flex-1` → 主内容区拉伸吃满剩余空间
- `min-h-[calc(100vh-4rem-3rem)]` = 100vh - Header(h-16=4rem) - Footer(h-12=3rem),保证主内容区最小高度合适
- `<Footer />` 挂在 main 之后、Modals 之前

- [ ] **Step 2: 本地验证**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend
pnpm dev
```

浏览器登录后依次访问:`/`、`/detail/<某视频id>`、`/library`、`/square`、`/profile`、`/storyboards`(如已有分镜脚本再访问 `/storyboard/<id>`)。
预期:每个页面底部都能看到一行居中的备案占位符,顶部一条 hairline 分割线,颜色是 `text-av-text-tertiary`(暗淡)。

- [ ] **Step 3: 提交**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script
git add frontend/src/components/Layout.tsx
git commit -m "feat(frontend): mount Footer under Layout for all authenticated pages"
```

---

### Task 4: 在 LoginPage 中挂载 Footer

**Files:**
- Modify: `frontend/src/pages/LoginPage.tsx`

**Interfaces:**
- Consumes: `Footer` from `../components/Footer`
- Produces: 无

**注意背景:** LoginPage 外层是 `fixed inset-0 overflow-hidden flex items-center justify-center`——固定占满视口、水平和垂直居中表单。想要 footer 贴底,不能改这个布局(表单居中效果依赖它),而是把 footer 用 `absolute bottom-0 left-0 right-0` 直接钉在视口底部。因为背景装饰层有 `pointer-events-none`,`z-10`(footer 的 z-10 优先级和表单一致)不会被覆盖。

- [ ] **Step 1: 修改 LoginPage.tsx**

**改动 1:添加 import**

找到第 6 行:

```tsx
import EyeIcon from '../components/EyeIcon'
```

在其后新增一行:

```tsx
import EyeIcon from '../components/EyeIcon'
import Footer from '../components/Footer'
```

**改动 2:在最外层容器末尾追加 `<Footer />`**

找到 return 里最外层 `<div className="fixed inset-0 ...">` 的**结束标签** `</div>`(文件最后一个 div 的关闭,约第 340 行),在它前面插入 `<Footer />`。

具体来说,当前最后几行结构是:

```tsx
        </div>
      </div>
    </div>
  )
}

export default LoginPage
```

从内层往外三个 `</div>` 分别对应:Form Card 关闭、`w-full max-w-md relative z-10` 关闭、`fixed inset-0` 最外层关闭。在**最外层 `</div>`** 前面插入 Footer:

```tsx
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default LoginPage
```

即在原本 `      </div>\n    </div>` 之间加一行 `      <Footer />`。

**改动 3:给 Footer 追加 absolute 定位类**

由于外层是 `fixed inset-0`,Footer 在文档流里不会自动贴底。有两种方式,选**方式 A**(修改挂载处样式,保持 Footer 组件通用):

在 LoginPage 里用 wrapper 包一层:

```tsx
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <Footer />
      </div>
    </div>
```

这样 Footer 组件本体不变,通过 wrapper 决定"钉底"行为。

- [ ] **Step 2: 本地验证**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend
pnpm dev
```

访问 `http://localhost:5173/login`(或实际 dev 端口)。
预期:footer 贴在视口底部,不遮挡登录卡片(登录卡片依然居中),背景装饰不遮挡 footer 文字。窗口高度拉小,footer 依然在底部。

- [ ] **Step 3: 提交**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script
git add frontend/src/pages/LoginPage.tsx
git commit -m "feat(frontend): mount Footer on LoginPage with absolute bottom positioning"
```

---

### Task 5: 在 RegisterPage 中挂载 Footer

**Files:**
- Modify: `frontend/src/pages/RegisterPage.tsx`

**Interfaces:**
- Consumes: `Footer` from `../components/Footer`
- Produces: 无

**结构同 LoginPage**——外层也是 `fixed inset-0 overflow-hidden flex items-center justify-center`,同样用 `absolute bottom-0` wrapper 钉底。

- [ ] **Step 1: 修改 RegisterPage.tsx**

**改动 1:添加 import**

找到第 6 行:

```tsx
import EyeIcon from '../components/EyeIcon'
```

在其后新增:

```tsx
import EyeIcon from '../components/EyeIcon'
import Footer from '../components/Footer'
```

**改动 2:在最外层 `fixed inset-0` 容器末尾追加 Footer wrapper**

找到文件末尾附近的结构(约第 507-509 行):

```tsx
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
```

改成:

```tsx
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <Footer />
      </div>
    </div>
  )
}

export default RegisterPage
```

- [ ] **Step 2: 本地验证**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend
pnpm dev
```

访问 `http://localhost:5173/register`(如果 `features.signUp = false` 会被重定向到 `/login`,这时改 `frontend/src/config/features.ts` 里的 `signUp: true` 临时打开)。
预期:footer 贴在视口底部,不遮挡注册卡片(尤其是邮箱注册表单更长,footer 不能挡到"注册"按钮)。

- [ ] **Step 3: 提交**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script
git add frontend/src/pages/RegisterPage.tsx
git commit -m "feat(frontend): mount Footer on RegisterPage with absolute bottom positioning"
```

---

### Task 6: 在 ForgotPasswordPage 中挂载 Footer

**Files:**
- Modify: `frontend/src/pages/ForgotPasswordPage.tsx`

**Interfaces:**
- Consumes: `Footer` from `../components/Footer`
- Produces: 无

**结构同 LoginPage / RegisterPage**——外层 `fixed inset-0`,同样用 `absolute bottom-0` wrapper。

- [ ] **Step 1: 修改 ForgotPasswordPage.tsx**

**改动 1:添加 import**

找到第 3 行附近:

```tsx
import { useSendCodeMutation, useResetPasswordMutation } from '../store/videoApi'
```

在其后新增:

```tsx
import { useSendCodeMutation, useResetPasswordMutation } from '../store/videoApi'
import Footer from '../components/Footer'
```

**改动 2:在最外层 `fixed inset-0` 容器末尾追加 Footer wrapper**

找到文件末尾(约第 380-382 行):

```tsx
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
```

改成:

```tsx
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <Footer />
      </div>
    </div>
  )
}

export default ForgotPasswordPage
```

- [ ] **Step 2: 本地验证**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend
pnpm dev
```

访问 `http://localhost:5173/forgot-password`。
预期:footer 贴视口底部,不遮挡"重置密码"表单和"返回登录"链接。

- [ ] **Step 3: 提交**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script
git add frontend/src/pages/ForgotPasswordPage.tsx
git commit -m "feat(frontend): mount Footer on ForgotPasswordPage with absolute bottom positioning"
```

---

### Task 7: 全量验证

**Files:** 无(纯手工/编译验证)

**Interfaces:** 无

- [ ] **Step 1: TypeScript 检查**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend
npx tsc --noEmit
```

预期:无 error 输出。

- [ ] **Step 2: 生产构建**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend
pnpm build
```

预期:构建成功,`dist/` 目录生成,`dist/beian-police-badge.svg` 存在。

- [ ] **Step 3: 手工路由巡检**

`pnpm dev` 启动后,依次打开 13 个路由,截图或目视确认每个页面底部都有 Footer(样式一致、备案占位符可见、警徽图标显示):

已登录路由(10 个):
1. `/`
2. `/detail/<任一视频id>`
3. `/library`
4. `/library/collections/<某个id>`(如无则跳过,不影响验收)
5. `/library/tags/<某个id>`(如无则跳过)
6. `/library/search`
7. `/square`
8. `/profile`
9. `/storyboards`
10. `/storyboard/<某个id>`(如无则跳过)

未登录路由(3 个,先退出登录再访问):
11. `/login`
12. `/register`(如 `features.signUp = false` 会重定向到 login,验证时可先手动改配置)
13. `/forgot-password`

- [ ] **Step 4: 点击链接验证**

在任一页面点击:
- ICP 备案号 → 应在新标签页打开 `https://beian.miit.gov.cn`
- 公安备案号 → 应在新标签页打开 `http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=<公安备案号数字,如:11010802012345>`(URL 里能看到占位符原文)

- [ ] **Step 5: 响应式检查**

Chrome DevTools 切换到 iPhone SE(375px 宽度)、iPad(768px)、桌面(1440px)三档,观察 footer 在小屏是否会因文字过长而换行——`flex-wrap` 已开启,允许换行,不会溢出。

- [ ] **Step 6: 最终整体提交(如果前面任务有修修补补)**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script
git status  # 确认无未提交
```

如果无未提交,验证完成。如果还有小的样式微调,合并提交:

```bash
git add frontend/
git commit -m "chore(frontend): polish Footer alignment after full-route verification"
```

---

## 拿到真实备案号后的替换步骤(参考,非任务)

用户后续拿到备案号时:

1. 编辑 `frontend/src/components/Footer.tsx` 顶部 3 个常量:
   - `ICP_NUMBER` → 换成真实号(如 `京ICP备20260001号-1`)
   - `POLICE_RECORD_CODE` → 换成公安备案数字部分(如 `11010802036789`)
   - `POLICE_TEXT` → 换成完整文案(如 `京公网安备 11010802036789 号`)
2. 如公安部要求使用官方警徽 PNG,把 `frontend/public/beian-police-badge.svg` 替换成 `beian-police-badge.png`,同时把 Footer 里的 `.svg` 改成 `.png`
3. `pnpm build` 后重新部署即可
