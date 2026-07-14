# 主页底部备案号 Footer 设计

**日期:** 2026-07-09
**作者:** luka + Claude
**状态:** approved

## 背景与目标

按工信部要求,ICP 备案号必须在网站底部显式展示;某些省市额外要求挂公安备案。本次任务在前端所有页面(含未登录页)底部新增一个统一 Footer,同时预留 ICP 备案号 + 公安备案号 + 警徽图标,占位符先放好,用户拿到真实号码后一处替换即可。

## 范围

- **In scope**
  - 新增 `frontend/src/components/Footer.tsx` 组件
  - 在 `Layout.tsx` 挂载(覆盖所有已登录页)
  - 在 `LoginPage.tsx` / `RegisterPage.tsx` / `ForgotPasswordPage.tsx` 分别挂载(覆盖未登录页)
  - 静态资源 `frontend/public/beian-police-badge.png`(公安部警徽官方图,~2KB)

- **Out of scope**
  - 后端改动(纯前端静态展示)
  - 版权信息 / 关于我们 / 用户协议 等其他 footer 链接
  - Sticky footer(会遮挡长内容页,已排除)
  - 从服务端下发备案号(YAGNI,常量即可)

## 架构

### 挂载策略

现状:所有登录后页面共用 `Layout.tsx`(含 Header + `<Outlet />`);登录/注册/找回密码这三个页面**不走 Layout**,各自独立渲染。

因此 Footer 需要在两处挂载:

1. **已登录页面** → 在 `Layout.tsx` 内 `<main>` 之后追加 `<Footer />`,自动覆盖 12 个已登录路由
2. **未登录页面** → 在 `LoginPage` / `RegisterPage` / `ForgotPasswordPage` 各自最外层容器末尾追加 `<Footer />`,并让容器变成 `min-h-screen flex flex-col`,`<main>` 或内容区加 `flex-1`,让 footer 自然贴底

### 组件设计

`Footer.tsx` 是**纯静态展示组件**,无 props,无状态,无副作用。备案号通过组件顶部 3 个常量集中管理:

```tsx
const ICP_NUMBER = '<ICP 备案号,如:京ICP备12345678号-1>'
const POLICE_RECORD_CODE = '<公安备案号数字,如:11010802012345>'
const POLICE_TEXT = '<公安备案文案,如:京公网安备 11010802012345 号>'
```

拿到真实号码后**只改这 3 个常量**,不需要碰其他文件。

## 视觉规范

- **高度:** `h-12`(48px),与 Header 视觉分量对等
- **顶部分割:** `border-t border-av-border-subtle`(hairline,与卡片边框一致)
- **容器宽度:** `max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8`(与 `App.tsx` 主内容区一致)
- **内容排布:** 单行、水平居中、`flex items-center justify-center gap-4`
- **字号/颜色:**
  - 文字:`text-xs text-av-text-tertiary`
  - 分隔符 `·`:`text-av-border-subtle`(更弱一档,不抢戏)
  - hover 态:`hover:text-av-text-secondary transition-colors`
- **警徽图标:** `w-3.5 h-3.5`,与文字基线对齐,`inline-flex items-center gap-1.5`
- **外链安全:** `target="_blank" rel="noopener noreferrer"` 双跳
- **图标 alt:** `alt=""`(装饰性,避免屏幕阅读器重复朗读)

## 完整组件实现

```tsx
// frontend/src/components/Footer.tsx

// 备案号统一管理,拿到号码后只需改这 3 个常量
const ICP_NUMBER = '<ICP 备案号,如:京ICP备12345678号-1>'
const POLICE_RECORD_CODE = '<公安备案号数字,如:11010802012345>'
const POLICE_TEXT = '<公安备案文案,如:京公网安备 11010802012345 号>'

function Footer() {
  return (
    <footer className="border-t border-av-border-subtle mt-auto">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-center gap-4 text-xs text-av-text-tertiary">
        <a
          href="https://beian.miit.gov.cn"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-av-text-secondary transition-colors"
        >
          {ICP_NUMBER}
        </a>
        <span className="text-av-border-subtle">·</span>
        <a
          href={`http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=${POLICE_RECORD_CODE}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-av-text-secondary transition-colors inline-flex items-center gap-1.5"
        >
          <img
            src="/beian-police-badge.png"
            alt=""
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

## 改动清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `frontend/src/components/Footer.tsx` | 新建 | 组件本体 |
| `frontend/public/beian-police-badge.png` | 新建 | 公安部警徽 PNG,约 2KB |
| `frontend/src/components/Layout.tsx` | 修改 | 在 `<main>` 后追加 `<Footer />` |
| `frontend/src/pages/LoginPage.tsx` | 修改 | 外层容器变 flex 布局,追加 `<Footer />` |
| `frontend/src/pages/RegisterPage.tsx` | 修改 | 同上 |
| `frontend/src/pages/ForgotPasswordPage.tsx` | 修改 | 同上 |

## 错误处理与边界

- 纯静态渲染,无数据源,无异步,无错误场景
- 占位符未替换时,链接依然可点(会跳到 `beian.miit.gov.cn` / `beian.gov.cn` 首页,不会 404)
- 警徽图片加载失败时,`alt=""` 保证不显示破损文字,只影响装饰,不影响链接功能

## 验证

1. **本地开发**:`cd frontend && pnpm dev`,浏览器访问以下路由,确认 footer 位于底部、样式一致:
   - `/`、`/detail/:id`、`/library`、`/library/collections/:id`、`/library/tags/:id`、`/library/search`、`/square`、`/profile`、`/storyboards`、`/storyboard/:id`(已登录页共 10 个)
   - `/login`、`/register`、`/forgot-password`(未登录页共 3 个)
2. **交互**:点击 ICP 链接 → 新标签页打开 `https://beian.miit.gov.cn`;点击公安备案链接 → 新标签页打开 `http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=<占位符>`
3. **响应式**:窗口宽度 `<640px`、`640-1024px`、`>1024px` 三档下,footer 各元素不换行/不溢出
4. **未登录页贴底**:窗口高度大、内容少时,footer 依然贴视口底;内容多需滚动时,footer 在内容之后
5. **TypeScript**:`cd frontend && npx tsc --noEmit` 通过
6. **打包**:`cd frontend && pnpm build` 通过

## 拿到真实备案号后的替换步骤

1. 打开 `frontend/src/components/Footer.tsx`
2. 修改顶部 3 个常量:`ICP_NUMBER`、`POLICE_RECORD_CODE`、`POLICE_TEXT`
3. 重启 dev 服务或重新打包即可

## 参考

- 工信部备案系统:<https://beian.miit.gov.cn>
- 公安部备案系统:<http://www.beian.gov.cn>
- 参考同类站点 footer 视觉:飞书、Linear、Notion 官网
