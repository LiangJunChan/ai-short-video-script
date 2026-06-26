# AI短视频脚本平台 -- 设计规范文档

> 本文档为 AI 代码助手（Cursor / GitHub Copilot / Windsurf 等）提供完整的设计实现参考。
> 严格按照本文档中的色值、类名、CSS 片段修改 React + Tailwind CSS 项目文件，即可还原暗色科技感设计。

---

## 1. 项目概述

| 属性 | 值 |
|---|---|
| 平台名称 | AI短视频脚本平台 |
| 技术栈 | React 18 + TypeScript + Vite + Tailwind CSS v3/v4 |
| 设计风格 | Retro-futuristic 暗色科技感 (Dark Tech Aesthetic) |
| 设计参考 | Vercel / Linear 暗色模式 + 霓虹辉光点缀 |
| 字体 | Inter（正文/标题）+ JetBrains Mono（等宽/代码） |
| 基础背景色 | `#08090d`（近乎纯黑，带微蓝调） |
| 主品牌色 | `#06d6a0`（青绿色 / Cyan-Mint） |
| 辅助强调色 | `#4cc9f0`（电蓝色 / Electric Blue） |

---

## 2. 颜色系统 (Color System)

### 2.1 背景色（Background Colors）

| Token 名称 | Hex 值 | 用途说明 |
|---|---|---|
| `--color-bg-primary` | `#08090d` | 页面最底层背景、`<body>` 背景 |
| `--color-bg-secondary` | `#0f1117` | 卡片、面板、导航栏的底色 |
| `--color-bg-tertiary` | `#161822` | 输入框背景、标签背景、pill 容器背景 |
| `--color-bg-elevated` | `#1c1f2e` | 浮层、下拉菜单、提升层级元素 |
| `--color-bg-hover` | `#232738` | 按钮/行 hover 态背景 |
| `--color-bg-active` | `#2a2f42` | 按钮/行 active/pressed 态背景 |

### 2.2 边框色（Border Colors）

| Token 名称 | Hex 值 | 用途说明 |
|---|---|---|
| `--color-border-default` | `#1e2233` | 默认边框（卡片、输入框） |
| `--color-border-subtle` | `#181b28` | 最淡边框（导航栏底边、分割线） |
| `--color-border-strong` | `#2a2f45` | 强调边框（hover 态、选中态） |
| `--color-border-focus` | `#06d6a0` | 输入框 focus 边框（品牌色） |

### 2.3 文字色（Text Colors）

| Token 名称 | Hex 值 | 用途说明 |
|---|---|---|
| `--color-text-primary` | `#e8ecf4` | 主文字（标题、正文） |
| `--color-text-secondary` | `#8892a8` | 次要文字（描述、标签、辅助信息） |
| `--color-text-tertiary` | `#5a6478` | 三级文字（时间戳、占位符、禁用态） |
| `--color-text-inverse` | `#08090d` | 反色文字（品牌色按钮上的白色/深色文字） |

### 2.4 品牌色（Brand Colors）

| Token 名称 | 值 | 用途说明 |
|---|---|---|
| `--color-primary` | `#06d6a0` | 主品牌色 -- CTA 按钮、链接、活跃态指示器、focus 边框 |
| `--color-primary-hover` | `#34e0b5` | 主品牌色 hover 态 -- 鼠标悬停时的品牌元素 |
| `--color-primary-muted` | `rgba(6, 214, 160, 0.10)` | 品牌色淡底 -- 活跃 pill 背景、积分徽章背景 |
| `--color-primary-subtle` | `rgba(6, 214, 160, 0.05)` | 品牌色极淡底 -- 大面积背景色块 |
| `--color-accent` | `#4cc9f0` | 辅助强调色 -- 处理中状态、次要高亮、标签 hover |
| `--color-accent-muted` | `rgba(76, 201, 240, 0.10)` | 辅助色淡底 -- 辅助色 pill 背景 |

### 2.5 状态色（State Colors）

| Token 名称 | Hex 值 | 用途说明 |
|---|---|---|
| `--state-success` | `#06d6a0` | 成功/已完成（与主品牌色一致） |
| `--state-warning` | `#ffd166` | 警告/待处理 |
| `--state-error` | `#ef476f` | 错误/删除/危险操作 |
| `--state-info` | `#4cc9f0` | 信息/处理中（与辅助色一致） |

### 2.6 辉光色（Glow Colors）

| Token 名称 | 值 | 用途说明 |
|---|---|---|
| `--shadow-glow` | `0 0 20px rgba(6, 214, 160, 0.15)` | 标准辉光 -- 活跃 pill、卡片 hover |
| `--shadow-glow-strong` | `0 0 40px rgba(6, 214, 160, 0.25)` | 强辉光 -- 按钮 hover、强调元素 |
| `--shadow-glow-accent` | `0 0 20px rgba(76, 201, 240, 0.15)` | 辅助辉光 -- 辅助色元素 hover |

---

## 3. Tailwind 配置映射

在 `tailwind.config.js`（v3）或 `tailwind.config.ts` 中添加以下扩展：

```js
// tailwind.config.js / tailwind.config.ts
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── 背景色 ──
        'av-bg': {
          primary:   '#08090d',
          secondary: '#0f1117',
          tertiary:  '#161822',
          elevated:  '#1c1f2e',
          hover:     '#232738',
          active:    '#2a2f42',
        },
        // ── 边框色 ──
        'av-border': {
          DEFAULT:  '#1e2233',
          subtle:   '#181b28',
          strong:   '#2a2f45',
          focus:    '#06d6a0',
        },
        // ── 文字色 ──
        'av-text': {
          primary:  '#e8ecf4',
          secondary: '#8892a8',
          tertiary: '#5a6478',
          inverse:  '#08090d',
        },
        // ── 品牌色 ──
        primary: '#06d6a0',
        'primary-hover': '#34e0b5',
        accent: '#4cc9f0',
        // ── 状态色 ──
        'av-state': {
          success: '#06d6a0',
          warning: '#ffd166',
          error:   '#ef476f',
          info:    '#4cc9f0',
        },
      },
      fontFamily: {
        display: ["'Inter'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
        body:    ["'Inter'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
        mono:    ["'JetBrains Mono'", "'Fira Code'", "'SF Mono'", 'monospace'],
      },
      fontSize: {
        'av-xs':   ['0.75rem',   { lineHeight: '1.5', letterSpacing: '0' }],
        'av-sm':   ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0' }],
        'av-base': ['0.875rem',  { lineHeight: '1.5', letterSpacing: '0' }],
        'av-lg':   ['1rem',      { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        'av-xl':   ['1.25rem',   { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        'av-2xl':  ['1.5rem',    { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        'av-3xl':  ['2rem',      { lineHeight: '1.25', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        'av-sm':   '6px',
        'av-md':   '10px',
        'av-lg':   '14px',
        'av-xl':   '18px',
        'av-full': '9999px',
      },
      boxShadow: {
        'av-sm':       '0 1px 2px rgba(0, 0, 0, 0.05)',
        'av-md':       '0 4px 12px rgba(0, 0, 0, 0.05)',
        'av-lg':       '0 8px 24px rgba(0, 0, 0, 0.05)',
        'av-floating': '0 12px 40px rgba(0, 0, 0, 0.4)',
        'av-glow':     '0 0 20px rgba(6, 214, 160, 0.15)',
        'av-glow-strong': '0 0 40px rgba(6, 214, 160, 0.25)',
        'av-glow-accent': '0 0 20px rgba(76, 201, 240, 0.15)',
      },
      transitionTimingFunction: {
        'av': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'av':   '200ms',
        'av-slow': '300ms',
      },
      zIndex: {
        'av-dropdown': '100',
        'av-sticky':   '200',
        'av-modal':    '300',
        'av-toast':    '400',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #06d6a0, #4cc9f0)',
        'gradient-radial': 'radial-gradient(ellipse at center, rgba(6,214,160,0.06) 0%, transparent 60%)',
      },
      maxWidth: {
        'av-container': '1400px',
      },
    },
  },
  plugins: [],
};
```

> **注意**：`av-` 前缀是 "AI Video" 的缩写，用于避免与 Tailwind 内置 token 冲突。如果项目已有其他前缀约定，请全局替换 `av-` 为项目前缀。

---

## 4. 全局 CSS 变量

在 `src/index.css`（或全局样式文件）的 `:root` 块中添加以下变量：

```css
/* src/index.css */

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* ── 背景色 ── */
  --color-bg-primary: #08090d;
  --color-bg-secondary: #0f1117;
  --color-bg-tertiary: #161822;
  --color-bg-elevated: #1c1f2e;
  --color-bg-hover: #232738;
  --color-bg-active: #2a2f42;

  /* ── 边框色 ── */
  --color-border-default: #1e2233;
  --color-border-subtle: #181b28;
  --color-border-strong: #2a2f45;
  --color-border-focus: #06d6a0;

  /* ── 文字色 ── */
  --color-text-primary: #e8ecf4;
  --color-text-secondary: #8892a8;
  --color-text-tertiary: #5a6478;
  --color-text-inverse: #08090d;

  /* ── 品牌色 ── */
  --color-primary: #06d6a0;
  --color-primary-hover: #34e0b5;
  --color-primary-muted: rgba(6, 214, 160, 0.10);
  --color-primary-subtle: rgba(6, 214, 160, 0.05);

  /* ── 辅助色 ── */
  --color-accent: #4cc9f0;
  --color-accent-muted: rgba(76, 201, 240, 0.10);

  /* ── 状态色 ── */
  --state-success: #06d6a0;
  --state-warning: #ffd166;
  --state-error: #ef476f;
  --state-info: #4cc9f0;

  /* ── 字体 ── */
  --font-display: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;

  /* ── 字号 ── */
  --text-xs: 0.75rem;
  --text-sm: 0.8125rem;
  --text-base: 0.875rem;
  --text-lg: 1rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 2rem;

  /* ── 行高 ── */
  --leading-tight: 1.25;
  --leading-normal: 1.5;

  /* ── 字间距 ── */
  --tracking-tight: -0.02em;
  --tracking-normal: 0;

  /* ── 字重 ── */
  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* ── 间距 ── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* ── 圆角 ── */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --radius-full: 9999px;

  /* ── 阴影 ── */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.05);
  --shadow-floating: 0 12px 40px rgba(0, 0, 0, 0.4);

  /* ── 辉光 ── */
  --shadow-glow: 0 0 20px rgba(6, 214, 160, 0.15);
  --shadow-glow-strong: 0 0 40px rgba(6, 214, 160, 0.25);
  --shadow-glow-accent: 0 0 20px rgba(76, 201, 240, 0.15);

  /* ── 过渡 ── */
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --duration: 200ms;
  --duration-slow: 300ms;

  /* ── Z-index ── */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal: 300;
  --z-toast: 400;
}

/* ── 暗色模式默认值 ── */
html.dark {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  letter-spacing: var(--tracking-normal);
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## 5. 组件设计规范

### 5.1 TopNavbar（顶部导航栏）

**视觉描述**：固定在页面顶部，高度 64px（h-16），使用 glassmorphism 效果（半透明背景 + 模糊），底部有极淡边框。左侧 Logo + 导航 pill，右侧积分徽章 + 操作按钮 + 头像。

**Tailwind 类**：
```tsx
<nav className="sticky top-0 z-40 h-16 flex items-center justify-between px-8"
     style={{
       background: 'rgba(15, 17, 23, 0.8)',
       backdropFilter: 'blur(24px)',
       WebkitBackdropFilter: 'blur(24px)',
       borderBottom: '1px solid var(--color-border-subtle)',
     }}>
  {/* 左侧：Logo */}
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-av-glow">
      {/* Logo SVG icon, color: var(--color-text-inverse) */}
    </div>
    <span className="text-av-text-primary font-semibold text-base tracking-tight">AI短视频</span>
  </div>

  {/* 中间：导航 Pill */}
  <div className="flex items-center gap-1 rounded-full px-1 py-1"
       style={{ background: 'rgba(22, 24, 34, 0.6)' }}>
    {/* 活跃项 */}
    <a className="px-4 py-1.5 rounded-full text-sm font-medium"
       style={{
         background: 'var(--color-primary-muted)',
         color: 'var(--color-primary)',
         boxShadow: 'var(--shadow-glow)',
       }}>
      广场
    </a>
    {/* 非活跃项 */}
    <a className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200"
       style={{ color: 'var(--color-text-secondary)' }}>
      素材库
    </a>
  </div>

  {/* 右侧：积分徽章 + 按钮 + 头像 */}
  <div className="flex items-center gap-3">
    {/* 积分徽章 */}
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
         style={{
           background: 'rgba(22, 24, 34, 0.6)',
           border: '1px solid var(--color-border-subtle)',
         }}>
      <span className="text-av-text-secondary font-medium">394</span>
    </div>
    {/* 主按钮 */}
    <button className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-gradient-primary hover:opacity-90 transition-opacity duration-200"
            style={{ color: 'var(--color-text-inverse)' }}>
      上传视频
    </button>
    {/* 头像 */}
    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-semibold cursor-pointer"
         style={{ color: 'var(--color-text-inverse)' }}>
      U
    </div>
  </div>
</nav>
```

**Hover / Active 态**：
- 导航 pill 非活跃项 hover：`color: var(--color-text-primary)`, `background: var(--color-bg-hover)`
- 积分徽章 hover：边框变为 `var(--color-border-strong)`
- 头像 hover：边框变为 `var(--color-primary)` 带辉光

---

### 5.2 VideoCard（视频卡片）

**视觉描述**：竖版 9:16 缩略图卡片，圆角 xl，深色背景。缩略图区域有渐变底栏显示标题和时间。左上角状态徽章，右上角 hover 时显示操作按钮（收藏/删除）。底部标签区域。Hover 时整卡上浮 + 霓虹边框 + 辉光。

**Tailwind 类**：
```tsx
<article className="video-card rounded-xl overflow-hidden cursor-pointer"
         style={{
           background: 'var(--color-bg-secondary)',
           border: '1px solid var(--color-border-subtle)',
         }}>
  {/* 缩略图区域 9:16 */}
  <div className="relative aspect-[9/16]">
    {/* 状态徽章 - 左上角 */}
    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
      {/* 处理中状态 */}
      <span className="px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1.5"
            style={{ background: 'rgba(15, 17, 23, 0.5)', backdropFilter: 'blur(6px)', color: 'var(--color-text-secondary)' }}>
        <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--color-primary)' }} />
        处理中
      </span>
      {/* 已完成状态 */}
      <span className="px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1.5"
            style={{ background: 'rgba(15, 17, 23, 0.5)', backdropFilter: 'blur(6px)', color: 'var(--color-primary)' }}>
        {/* check icon SVG */}
        已完成
      </span>
      {/* 点赞数 */}
      <span className="px-2 py-0.5 rounded-md text-xs"
            style={{ background: 'rgba(15, 17, 23, 0.5)', backdropFilter: 'blur(6px)', color: 'var(--color-text-tertiary)' }}>
        ♡ 12
      </span>
    </div>

    {/* 操作按钮 - 右上角（hover 显示） */}
    <div className="card-actions absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10"
         style={{ opacity: 0 }}>
      <button className="w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-200"
              style={{ background: 'rgba(15, 17, 23, 0.5)', backdropFilter: 'blur(6px)', color: 'var(--color-text-secondary)' }}>
        {/* heart icon */}
      </button>
      <button className="w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-200"
              style={{ background: 'rgba(15, 17, 23, 0.5)', backdropFilter: 'blur(6px)', color: 'var(--color-text-secondary)' }}>
        {/* x icon */}
      </button>
    </div>

    {/* 播放图标 - 居中 */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full flex items-center justify-center"
           style={{ background: 'rgba(15, 17, 23, 0.7)', backdropFilter: 'blur(8px)' }}>
        {/* play icon */}
      </div>
    </div>

    {/* 底部渐变 + 文字 */}
    <div className="absolute bottom-0 left-0 right-0 p-3 pt-10"
         style={{ background: 'linear-gradient(to top, rgba(8, 9, 13, 0.85) 0%, transparent 60%)' }}>
      <p className="text-sm font-semibold text-av-text-primary truncate">视频标题</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>3天前 · user1</p>
    </div>
  </div>

  {/* 标签区域 */}
  <div className="px-3 py-2.5 flex gap-1.5 flex-wrap">
    <span className="px-2 py-0.5 rounded-full text-xs"
          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
      美妆
    </span>
  </div>
</article>
```

**Hover / Active 态**：
```css
.video-card {
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1),
              border-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
.video-card:hover {
  transform: translateY(-2px);
  border: 1px solid rgba(6, 214, 160, 0.2);
  box-shadow: inset 0 0 20px rgba(6, 214, 160, 0.03), 0 0 20px rgba(6, 214, 160, 0.15);
}
.video-card:hover .card-actions {
  opacity: 1;
}
.card-actions {
  opacity: 0;
  transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

**缩略图占位渐变**（无真实图片时使用）：
```css
.thumb-gradient-1 { background: linear-gradient(160deg, #0a2e2e 0%, #0d1b2a 50%, #08090d 100%); }
.thumb-gradient-2 { background: linear-gradient(160deg, #1a1040 0%, #0d1b2a 50%, #08090d 100%); }
.thumb-gradient-3 { background: linear-gradient(160deg, #0a2e2e 0%, #101830 50%, #08090d 100%); }
.thumb-gradient-4 { background: linear-gradient(160deg, #1a1040 0%, #0a1e30 50%, #08090d 100%); }
.thumb-gradient-5 { background: linear-gradient(160deg, #0d2a20 0%, #0d1b2a 60%, #08090d 100%); }
.thumb-pattern {
  background-image:
    radial-gradient(circle at 20% 30%, rgba(6, 214, 160, 0.06) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(76, 201, 240, 0.04) 0%, transparent 50%);
}
```

---

### 5.3 LoginForm（登录表单）

**视觉描述**：全屏深色背景，带动态网格线 + 中心辉光 + 扫描线 + 浮动渐变球。居中卡片使用 neon-border 效果，内含输入框和渐变按钮。

**Tailwind 类**：
```tsx
{/* 全屏背景层 */}
<div className="fixed inset-0 overflow-hidden pointer-events-none">
  <div className="absolute inset-0 grid-bg animate-grid-move" />
  <div className="absolute inset-0"
       style={{ background: 'radial-gradient(ellipse at center, rgba(6,214,160,0.06) 0%, transparent 60%)' }} />
  {/* 浮动渐变球 */}
  <div className="absolute -top-32 -right-32 rounded-full animate-float"
       style={{ width: '400px', height: '400px', background: 'var(--color-primary-muted)', filter: 'blur(100px)' }} />
  <div className="absolute -bottom-32 -left-32 rounded-full animate-float"
       style={{ width: '350px', height: '350px', background: 'var(--color-accent-muted)', filter: 'blur(100px)', animationDelay: '2s' }} />
</div>

{/* 主内容 */}
<main className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
  <div className="w-full max-w-md animate-slide-up">
    {/* Logo */}
    <div className="flex flex-col items-center mb-8">
      <div className="w-16 h-16 rounded-2xl bg-gradient-primary animate-glow-pulse flex items-center justify-center mb-4">
        {/* Logo SVG */}
      </div>
      <h1 className="text-av-3xl font-bold gradient-text">AI短视频脚本平台</h1>
    </div>

    {/* 登录卡片 */}
    <div className="neon-border rounded-xl p-8"
         style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      {/* 标题 */}
      <div className="mb-6">
        <h2 className="text-av-xl font-semibold mb-1 text-av-text-primary">登录到您的账户</h2>
        <p className="text-sm text-av-text-secondary">使用您的账户继续创作</p>
      </div>

      {/* 错误提示 */}
      <div className="mb-5 px-4 py-3 rounded-lg"
           style={{ background: 'rgba(239, 71, 111, 0.1)', borderLeft: '3px solid var(--state-error)' }}>
        <p className="text-sm" style={{ color: 'var(--state-error)' }}>用户名或密码错误</p>
      </div>

      {/* 输入框 */}
      <input className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200"
             style={{
               backgroundColor: 'var(--color-bg-tertiary)',
               border: '1px solid var(--color-border-default)',
               color: 'var(--color-text-primary)',
             }}
             onFocus={(e) => {
               e.target.style.borderColor = 'var(--color-border-focus)';
               e.target.style.boxShadow = '0 0 0 3px rgba(6,214,160,0.1)';
             }}
             onBlur={(e) => {
               e.target.style.borderColor = 'var(--color-border-default)';
               e.target.style.boxShadow = 'none';
             }}
      />

      {/* 登录按钮 */}
      <button className="w-full bg-gradient-primary rounded-lg py-3 text-sm font-semibold transition-all duration-200 cursor-pointer"
              style={{ color: 'white', border: 'none' }}>
        登录
      </button>
    </div>
  </div>
</main>
```

---

### 5.4 CollectionCard（收藏夹卡片）

**视觉描述**：surface 底色卡片，左上角 emoji 图标，右上角 hover 显示删除按钮。包含标题、描述、视频计数。Hover 时上浮 1px + neon-border + 辉光。

**Tailwind 类**：
```tsx
<div className="collection-card rounded-xl p-5 cursor-pointer group"
     style={{
       backgroundColor: 'var(--color-bg-secondary)',
       border: '1px solid var(--color-border-subtle)',
       borderRadius: 'var(--radius-xl)',
     }}>
  <div className="flex items-start justify-between">
    {/* Emoji 图标 */}
    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
         style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
      💄
    </div>
    {/* 删除按钮（hover 显示） */}
    <button className="delete-btn p-1.5 rounded-lg transition-colors duration-200"
            style={{ color: 'var(--color-text-tertiary)', opacity: 0 }}>
      {/* x icon */}
    </button>
  </div>
  <h3 className="font-semibold text-av-text-primary mt-4 mb-1">美妆测评</h3>
  <p className="text-sm text-av-text-secondary mb-4 truncate">热门美妆产品测评与试用分享</p>
  <div className="flex items-center gap-1.5 text-xs text-av-text-tertiary">
    {/* folder icon */}
    <span>12 个视频</span>
  </div>
</div>
```

**Hover / Active 态**：
```css
.collection-card {
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1),
              border-color 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.collection-card:hover {
  transform: translateY(-1px);
  border: 1px solid rgba(6, 214, 160, 0.2);
  box-shadow: inset 0 0 20px rgba(6, 214, 160, 0.03), 0 0 20px rgba(6, 214, 160, 0.15);
}
.collection-card .delete-btn {
  opacity: 0;
  transition: opacity 160ms cubic-bezier(0.4, 0, 0.2, 1);
}
.collection-card:hover .delete-btn {
  opacity: 1;
}
.collection-card .delete-btn:hover {
  color: var(--state-error);
  background: rgba(239, 71, 111, 0.1);
}
```

---

### 5.5 StoryboardCard（脚本卡片）

**视觉描述**：横向列表卡片，左侧状态圆点（带辉光动画），中间标题+描述，右侧标签+时间+视频数+操作按钮。Hover 时上浮 1px + neon-border。

**Tailwind 类**：
```tsx
<div className="storyboard-card rounded-xl p-5 flex items-center justify-between"
     style={{
       backgroundColor: 'var(--color-bg-secondary)',
       border: '1px solid var(--color-border-subtle)',
     }}>
  <div className="flex items-center gap-4 min-w-0">
    {/* 状态圆点 - 已完成（辉光动画） */}
    <div className="w-3 h-3 rounded-full flex-shrink-0 status-glow"
         style={{ backgroundColor: 'var(--state-success)' }} />
    {/* 状态圆点 - 处理中（脉冲动画） */}
    <div className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse"
         style={{ backgroundColor: 'var(--color-accent)', boxShadow: '0 0 8px rgba(76, 201, 240, 0.4)' }} />
    {/* 状态圆点 - 草稿（静态灰色） */}
    <div className="w-3 h-3 rounded-full flex-shrink-0"
         style={{ backgroundColor: 'var(--color-text-tertiary)' }} />

    {/* 标题 + 描述 */}
    <div className="min-w-0">
      <h3 className="text-sm font-semibold truncate text-av-text-primary">美妆种草脚本 #12</h3>
      <p className="text-sm truncate mt-0.5 text-av-text-secondary">春季新品口红推荐...</p>
    </div>
  </div>

  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
    {/* 标签 */}
    <div className="flex items-center gap-1.5">
      <span className="tag-pill px-2 py-0.5 rounded-md text-xs">美妆</span>
    </div>
    {/* 时间 */}
    <span className="text-xs text-av-text-tertiary">创建于 3天前</span>
    {/* 视频数 */}
    <div className="flex items-center gap-1 text-xs text-av-text-secondary">
      {/* video icon */}
      <span>3个视频</span>
    </div>
    {/* 操作按钮（hover 显示） */}
    <div className="card-actions flex items-center gap-1" style={{ opacity: 0 }}>
      <button className="px-3 py-1.5 rounded-lg text-xs font-medium ghost-btn"
              style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}>
        编辑
      </button>
      <button className="px-3 py-1.5 rounded-lg text-xs font-medium ghost-btn"
              style={{ color: 'var(--state-error)', border: '1px solid var(--color-border-subtle)' }}>
        删除
      </button>
    </div>
  </div>
</div>
```

**Hover / Active 态**：
```css
.storyboard-card {
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
              border-color 200ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.storyboard-card:hover {
  transform: translateY(-1px);
  border-color: rgba(6, 214, 160, 0.2);
  box-shadow: inset 0 0 20px rgba(6, 214, 160, 0.03), 0 0 20px rgba(6, 214, 160, 0.06);
}
.storyboard-card .card-actions {
  opacity: 0;
  transition: opacity 160ms cubic-bezier(0.4, 0, 0.2, 1);
}
.storyboard-card:hover .card-actions {
  opacity: 1;
}
```

---

### 5.6 Tag / Badge（标签 / 徽章）

**视觉描述**：pill 形状，深色底色 + 淡文字。Hover 时背景变亮。

**Tailwind 类**：
```tsx
{/* 标准标签 pill（圆角 full） */}
<span className="px-2 py-0.5 rounded-full text-xs"
      style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
  美妆
</span>

{/* 标签 pill（圆角 md，用于脚本卡片内） */}
<span className="tag-pill px-2 py-0.5 rounded-md text-xs"
      style={{
        backgroundColor: 'var(--color-bg-tertiary)',
        color: 'var(--color-text-secondary)',
        border: '1px solid var(--color-border-subtle)',
      }}>
  美妆
</span>

{/* 带删除按钮的标签 pill（素材库侧边栏） */}
<span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors duration-200"
      style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
  #美妆
  <span className="text-xs opacity-60">(3)</span>
  <button className="ml-0.5" style={{ color: 'var(--color-text-tertiary)', opacity: 0 }}>
    {/* x icon */}
  </button>
</span>
```

**Hover 态**：
```css
.tag-pill:hover {
  background-color: var(--color-bg-hover);
}
/* 侧边栏标签 hover */
.tag-pill:hover {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}
.tag-pill:hover .tag-delete {
  opacity: 1;
}
```

---

### 5.7 Button 变体

#### Primary 按钮（渐变）
```tsx
<button className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-gradient-primary transition-all duration-200 cursor-pointer"
        style={{ color: 'var(--color-text-inverse)', border: 'none' }}>
  上传视频
</button>
```
**Hover**：`boxShadow: var(--shadow-glow-strong)`, `transform: translateY(-1px)`
**Active**：`transform: translateY(0)`

#### Secondary 按钮（Ghost / 描边）
```tsx
<button className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
        style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)', background: 'transparent' }}>
  链接提取
</button>
```
**Hover**：`color: var(--color-text-primary)`, `border-color: var(--color-border-strong)`

#### Ghost 按钮（纯文字/图标）
```tsx
<button className="ghost-btn p-2 rounded-lg transition-colors duration-200"
        style={{ color: 'var(--color-text-secondary)', background: 'transparent', border: 'none' }}>
  {/* icon */}
</button>
```
**Hover**：`color: var(--color-text-primary)`, `background: var(--color-bg-hover)`

#### 危险操作按钮
```tsx
<button className="ghost-btn px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200"
        style={{ color: 'var(--state-error)', border: '1px solid var(--color-border-subtle)', background: 'transparent' }}>
  删除
</button>
```

---

### 5.8 Input 输入框

**Tailwind 类**：
```tsx
<input className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200"
       style={{
         backgroundColor: 'var(--color-bg-tertiary)',
         border: '1px solid var(--color-border-default)',
         color: 'var(--color-text-primary)',
       }}
       placeholder="输入用户名"
/>
```

**Focus 态**：
```css
border-color: var(--color-border-focus);  /* #06d6a0 */
box-shadow: 0 0 0 3px rgba(6, 214, 160, 0.1);
```

**React 实现方式**：
```tsx
<input
  className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200"
  style={{
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border-default)',
    color: 'var(--color-text-primary)',
  }}
  onFocus={(e) => {
    e.currentTarget.style.borderColor = 'var(--color-border-focus)';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(6,214,160,0.1)';
  }}
  onBlur={(e) => {
    e.currentTarget.style.borderColor = 'var(--color-border-default)';
    e.currentTarget.style.boxShadow = 'none';
  }}
/>
```

---

### 5.9 Modal（弹窗）

**视觉描述**：glassmorphism 半透明遮罩 + 居中卡片。

**Tailwind 类**：
```tsx
{/* 遮罩层 */}
<div className="fixed inset-0 z-av-modal flex items-center justify-center"
     style={{ background: 'rgba(8, 9, 13, 0.7)', backdropFilter: 'blur(8px)' }}>
  {/* 卡片 */}
  <div className="neon-border rounded-xl p-6 w-full max-w-lg animate-scale-in"
       style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
    <h2 className="text-av-xl font-semibold text-av-text-primary mb-4">弹窗标题</h2>
    {/* 内容 */}
    <div className="flex justify-end gap-3 mt-6">
      <button className="ghost-btn px-4 py-2 rounded-lg text-sm font-medium"
              style={{ border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}>
        取消
      </button>
      <button className="bg-gradient-primary px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ color: 'var(--color-text-inverse)' }}>
        确认
      </button>
    </div>
  </div>
</div>
```

---

## 6. 页面布局规范

### 6.1 登录页 (Login)

- **布局**：全屏 flex 居中，无导航栏
- **背景层**：fixed 全屏，包含 grid-bg 动画 + 径向辉光 + 扫描线 + 浮动渐变球
- **内容区**：`max-w-md` 居中，`animate-slide-up` 入场动画
- **间距**：Logo 区 `mb-8`，卡片内 `p-8`，表单 `space-y-5`

### 6.2 短视频广场 (Square)

- **布局**：顶部导航 + 主内容区
- **主内容**：`max-w-[1400px] mx-auto px-8 py-8`
- **页面头部**：flex justify-between，标题 + 排序 pill
- **视频网格**：`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5`
- **分页**：居中 flex，`mt-10`，`gap-4`

### 6.3 素材库 (Library)

- **布局**：顶部导航 + 三栏布局（收藏夹 3/4 + 侧边栏 1/4）
- **主内容**：`max-w-7xl mx-auto px-6 py-8`
- **收藏夹网格**：`grid grid-cols-2 gap-4`
- **侧边栏**：`w-72 flex-shrink-0`，包含标签区和搜索卡片
- **间距**：页面头部 `mb-8`，区块标题 `mb-5`，卡片内 `p-5`

### 6.4 脚本工作台 (Storyboards)

- **布局**：顶部导航 + 列表布局
- **主内容**：`max-w-5xl mx-auto px-8 py-10`
- **脚本列表**：`flex flex-col gap-4`
- **每行卡片**：flex items-center justify-between，`p-5`
- **空状态 CTA**：`mt-10 rounded-xl p-8`，居中文本

---

## 7. 动效规范

### 7.1 过渡时间

| 场景 | 时长 | 缓动函数 |
|---|---|---|
| 默认过渡 | `200ms` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| 慢速过渡 | `300ms` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| 快速显隐 | `160ms` | `cubic-bezier(0.4, 0, 0.2, 1)` |

### 7.2 Hover 效果

| 元素 | translateY | 边框 | 阴影 |
|---|---|---|---|
| VideoCard | `-2px` | neon-border | `var(--shadow-glow)` |
| CollectionCard | `-1px` | neon-border | `var(--shadow-glow)` |
| StoryboardCard | `-1px` | neon-border | 自定义 inset glow |
| Primary 按钮 | `-1px` | -- | `var(--shadow-glow-strong)` |
| Ghost 按钮 | -- | -- | `background: var(--color-bg-hover)` |

### 7.3 动画关键帧

```css
/* 淡入 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 上滑入场 */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 缩放入场 */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

/* 辉光脉冲（3s 周期） */
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 15px rgba(6, 214, 160, 0.1); }
  50% { box-shadow: 0 0 30px rgba(6, 214, 160, 0.2); }
}

/* 浮动（4s 周期） */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

/* 网格移动（20s 周期） */
@keyframes gridMove {
  0% { background-position: 0 0; }
  100% { background-position: 60px 60px; }
}

/* 扫描线（8s 周期） */
@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}

/* 状态辉光脉冲（2.5s 周期） */
@keyframes statusGlow {
  0%, 100% { box-shadow: 0 0 6px rgba(6, 214, 160, 0.3); }
  50% { box-shadow: 0 0 14px rgba(6, 214, 160, 0.5); }
}

/* 脉冲圆点（1.5s 周期） */
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

### 7.4 动画工具类

```css
.animate-fade-in   { animation: fadeIn 200ms cubic-bezier(0.4, 0, 0.2, 1); }
.animate-slide-up  { animation: slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1); }
.animate-scale-in  { animation: scaleIn 300ms cubic-bezier(0.4, 0, 0.2, 1); }
.animate-glow-pulse { animation: glowPulse 3s ease-in-out infinite; }
.animate-float     { animation: float 4s ease-in-out infinite; }
.animate-grid-move { animation: gridMove 20s linear infinite; }
```

### 7.5 Loading 骨架屏（Shimmer Skeleton）

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-tertiary) 0%,
    var(--color-bg-hover) 50%,
    var(--color-bg-tertiary) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 8. 关键 CSS 类定义

以下 CSS 类应添加到全局样式文件中（`src/index.css` 或 `src/styles/globals.css`）：

```css
/* ══════════════════════════════════════════
   AI短视频脚本平台 -- 关键 CSS 类
   ══════════════════════════════════════════ */

/* ── 霓虹边框（主品牌色） ── */
.neon-border {
  border: 1px solid rgba(6, 214, 160, 0.2);
  box-shadow: inset 0 0 20px rgba(6, 214, 160, 0.03);
}

/* ── 霓虹边框（辅助色） ── */
.neon-border-accent {
  border: 1px solid rgba(76, 201, 240, 0.2);
  box-shadow: inset 0 0 20px rgba(76, 201, 240, 0.03);
}

/* ── 辉光效果 ── */
.glow-primary {
  box-shadow: 0 0 20px rgba(6, 214, 160, 0.15);
}
.glow-strong {
  box-shadow: 0 0 40px rgba(6, 214, 160, 0.25);
}
.glow-accent {
  box-shadow: 0 0 20px rgba(76, 201, 240, 0.15);
}

/* ── 渐变（主品牌 → 辅助色） ── */
.gradient-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
}

/* ── 渐变文字 ── */
.gradient-text {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── 网格背景 ── */
.grid-bg {
  background-image:
    linear-gradient(rgba(6, 214, 160, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(6, 214, 160, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* ── Glassmorphism（毛玻璃） ── */
.glass {
  background: rgba(15, 17, 23, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.glass-light {
  background: rgba(15, 17, 23, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

/* ── Surface 卡片 ── */
.surface {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
}
.surface-elevated {
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

/* ── 标题排版 ── */
.heading-xl {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
}
.heading-lg {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
}
.heading-md {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-tight);
}
.heading-sm {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--weight-medium);
  line-height: var(--leading-tight);
}

/* ── 导航 pill 活跃态 ── */
.nav-pill-active {
  background: var(--color-primary-muted);
  color: var(--color-primary);
  box-shadow: var(--shadow-glow);
}

/* ── 排序 pill 活跃态 ── */
.sort-pill-active {
  background: var(--color-primary-muted);
  color: var(--color-primary);
  box-shadow: var(--shadow-glow);
}

/* ── Ghost 按钮 ── */
.ghost-btn {
  transition: color 160ms cubic-bezier(0.4, 0, 0.2, 1),
              background-color 160ms cubic-bezier(0.4, 0, 0.2, 1);
}
.ghost-btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-hover);
}

/* ── 渐变主按钮 ── */
.btn-gradient-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: var(--color-text-inverse);
  transition: box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1),
              transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-gradient-primary:hover {
  box-shadow: 0 0 24px rgba(6, 214, 160, 0.25);
  transform: translateY(-1px);
}
.btn-gradient-primary:active {
  transform: translateY(0);
}

/* ── 标签 pill ── */
.tag-pill {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-subtle);
  transition: background-color 160ms cubic-bezier(0.4, 0, 0.2, 1);
}
.tag-pill:hover {
  background-color: var(--color-bg-hover);
}

/* ── 状态辉光（已完成脚本） ── */
.status-glow {
  animation: statusGlow 2.5s ease-in-out infinite;
}

/* ── 脉冲圆点（处理中状态） ── */
.pulse-dot {
  animation: pulse-dot 1.5s ease-in-out infinite;
}

/* ── 底部渐变遮罩（视频卡片缩略图） ── */
.bottom-gradient {
  background: linear-gradient(to top, rgba(8, 9, 13, 0.85) 0%, transparent 60%);
}

/* ── 自定义滚动条 ── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: 9999px; }
::-webkit-scrollbar-thumb:hover { background: var(--color-text-tertiary); }

/* ── 隐藏滚动条 ── */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* ── 减弱动画（无障碍） ── */
@media (prefers-reduced-motion: reduce) {
  .video-card,
  .collection-card,
  .storyboard-card,
  .btn-gradient-primary,
  .ghost-btn,
  .tag-pill,
  .nav-pill { transition: none; }
  .status-glow,
  .pulse-dot,
  .animate-glow-pulse,
  .animate-float,
  .animate-grid-move { animation: none; }
}
```

---

## 9. 迁移指南

按以下步骤将此设计系统应用到现有 React + Tailwind CSS 项目：

### 步骤 1：更新 `tailwind.config.js`

将 [第 3 节](#3-tailwind-配置映射) 中的完整配置合并到项目的 `tailwind.config.js` 的 `theme.extend` 中。确保 `darkMode: 'class'` 已启用。

### 步骤 2：更新 `src/index.css`

将 [第 4 节](#4-全局-css-变量) 的 CSS 变量和 [第 8 节](#8-关键-css-类定义) 的自定义 CSS 类添加到全局样式文件。文件结构应为：

```
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { /* CSS 变量 */ }

/* 自定义类 */
.neon-border { ... }
.gradient-primary { ... }
/* ... 其余类 */
```

### 步骤 3：安装字体

在 `index.html` 的 `<head>` 中添加 Google Fonts 链接：

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

### 步骤 4：更新 `<html>` 标签

确保 `<html>` 标签包含 `class="dark"` 和 `lang="zh-CN"`：

```html
<html lang="zh-CN" class="dark">
```

### 步骤 5：更新 `<body>` 样式

在全局 CSS 中确保 body 使用正确的背景和文字色：

```css
body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### 步骤 6：逐组件替换样式

按照 [第 5 节](#5-组件设计规范) 的规范，逐个更新 React 组件：

1. **TopNavbar** -- 参考 5.1
2. **VideoCard** -- 参考 5.2
3. **LoginForm** -- 参考 5.3
4. **CollectionCard** -- 参考 5.4
5. **StoryboardCard** -- 参考 5.5
6. **Tag/Badge** -- 参考 5.6
7. **Button** -- 参考 5.7
8. **Input** -- 参考 5.8
9. **Modal** -- 参考 5.9

### 步骤 7：更新页面布局

按照 [第 6 节](#6-页面布局规范) 调整各页面的布局结构、间距和网格配置。

### 步骤 8：添加动效

按照 [第 7 节](#7-动效规范) 为组件添加过渡和动画。确保在 `@media (prefers-reduced-motion: reduce)` 中禁用所有动画。

### 步骤 9：测试验证

- 检查所有颜色是否与设计稿一致（使用浏览器 DevTools 对比色值）
- 验证所有 hover / focus / active 状态
- 验证动画流畅性
- 验证 `prefers-reduced-motion` 下动画是否禁用
- 验证在不同屏幕尺寸下的响应式布局

---

## 附录：快速色值速查表

| 用途 | 色值 |
|---|---|
| 页面背景 | `#08090d` |
| 卡片背景 | `#0f1117` |
| 输入框背景 | `#161822` |
| Hover 背景 | `#232738` |
| 默认边框 | `#1e2233` |
| 淡边框 | `#181b28` |
| 主文字 | `#e8ecf4` |
| 次要文字 | `#8892a8` |
| 三级文字 | `#5a6478` |
| 品牌色（主） | `#06d6a0` |
| 品牌色 hover | `#34e0b5` |
| 辅助色 | `#4cc9f0` |
| 成功 | `#06d6a0` |
| 警告 | `#ffd166` |
| 错误 | `#ef476f` |
| 信息 | `#4cc9f0` |
