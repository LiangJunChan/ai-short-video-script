# AI短视频脚本平台 — 布局参考文档（完整版）

> 本文档供 AI 代码助手（Trae / Cursor）直接参考，将 .design 画布中的暗色科技感设计还原到 React + Tailwind CSS 项目中。

---

## 一、设计令牌速查

### 颜色 — 背景层级

| CSS 变量 | 色值 | 用途 |
|----------|------|------|
| `--color-bg-primary` | `#08090d` | 页面最深背景 |
| `--color-bg-secondary` | `#0f1117` | 卡片/面板背景 |
| `--color-bg-tertiary` | `#161822` | 输入框/嵌套容器 |
| `--color-bg-elevated` | `#1c1f2e` | 浮层/下拉背景 |
| `--color-bg-hover` | `#232738` | 悬停态背景 |
| `--color-bg-active` | `#2a2f42` | 激活/按下态背景 |

### 颜色 — 边框

| CSS 变量 | 色值 | 用途 |
|----------|------|------|
| `--color-border-subtle` | `#181b28` | 最淡边框（Navbar、卡片） |
| `--color-border-default` | `#1e2233` | 默认边框（输入框、标签） |
| `--color-border-strong` | `#2a2f45` | 强调边框（分割线） |
| `--color-border-focus` | `#06d6a0` | 焦点态边框 |

### 颜色 — 文字

| CSS 变量 | 色值 | 用途 |
|----------|------|------|
| `--color-text-primary` | `#e8ecf4` | 主文字（标题、正文） |
| `--color-text-secondary` | `#8892a8` | 次要文字（描述、标签） |
| `--color-text-tertiary` | `#5a6478` | 辅助文字（占位、时间） |
| `--color-text-inverse` | `#08090d` | 反色文字（按钮上） |

### 颜色 — 品牌色

| CSS 变量 | 色值 | 用途 |
|----------|------|------|
| `--color-primary` | `#06d6a0` | 主品牌色（Mint/Cyan） |
| `--color-primary-hover` | `#34e0b5` | 主色悬停态 |
| `--color-primary-muted` | `rgba(6, 214, 160, 0.10)` | 主色低透明度背景 |
| `--color-primary-subtle` | `rgba(6, 214, 160, 0.05)` | 主色极低透明度背景 |
| `--color-accent` | `#4cc9f0` | 辅助品牌色（Electric Blue） |
| `--color-accent-muted` | `rgba(76, 201, 240, 0.10)` | 辅色低透明度背景 |

### 颜色 — 状态色

| CSS 变量 | 色值 | 用途 |
|----------|------|------|
| `--state-success` | `#06d6a0` | 成功（与 primary 相同） |
| `--state-warning` | `#ffd166` | 警告 |
| `--state-error` | `#ef476f` | 错误/删除 |
| `--state-info` | `#4cc9f0` | 信息（与 accent 相同） |

### 圆角

| CSS 变量 | 值 | 用途 |
|----------|------|------|
| `--radius-sm` | `6px` | 小元素（标签、小按钮） |
| `--radius-md` | `10px` | 中元素（输入框、pill） |
| `--radius-lg` | `14px` | 大元素（卡片、面板） |
| `--radius-xl` | `18px` | 超大元素（弹窗） |
| `--radius-full` | `9999px` | 全圆（头像、pill） |

### 阴影

| CSS 变量 | 值 | 用途 |
|----------|------|------|
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.05)` | 微投影 |
| `--shadow-md` | `0 4px 12px rgba(0, 0, 0, 0.05)` | 中等投影 |
| `--shadow-lg` | `0 8px 24px rgba(0, 0, 0, 0.05)` | 大投影 |
| `--shadow-floating` | `0 12px 40px rgba(0, 0, 0, 0.4)` | 浮层投影 |
| `--shadow-glow` | `0 0 20px rgba(6, 214, 160, 0.15)` | 品牌辉光（默认） |
| `--shadow-glow-strong` | `0 0 40px rgba(6, 214, 160, 0.25)` | 品牌辉光（强） |
| `--shadow-glow-accent` | `0 0 20px rgba(76, 201, 240, 0.15)` | 辅色辉光 |

---

## 二、Tailwind 配置（完整）

```js
// tailwind.config.js — 完整扩展配置
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Background
        'av-bg': {
          primary: '#08090d',
          secondary: '#0f1117',
          tertiary: '#161822',
          elevated: '#1c1f2e',
          hover: '#232738',
          active: '#2a2f42',
        },
        // Text
        'av-text': {
          primary: '#e8ecf4',
          secondary: '#8892a8',
          tertiary: '#5a6478',
          inverse: '#08090d',
        },
        // Border
        'av-border': {
          subtle: '#181b28',
          DEFAULT: '#1e2233',
          strong: '#2a2f45',
          focus: '#06d6a0',
        },
        // Brand Primary
        'av-primary': {
          DEFAULT: '#06d6a0',
          hover: '#34e0b5',
          muted: 'rgba(6, 214, 160, 0.10)',
          subtle: 'rgba(6, 214, 160, 0.05)',
        },
        // Brand Accent
        'av-accent': {
          DEFAULT: '#4cc9f0',
          muted: 'rgba(76, 201, 240, 0.10)',
        },
        // State
        'av-success': '#06d6a0',
        'av-warning': '#ffd166',
        'av-error': '#ef476f',
        'av-info': '#4cc9f0',
      },
      boxShadow: {
        'av-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'av-md': '0 4px 12px rgba(0, 0, 0, 0.05)',
        'av-lg': '0 8px 24px rgba(0, 0, 0, 0.05)',
        'av-floating': '0 12px 40px rgba(0, 0, 0, 0.4)',
        'av-glow': '0 0 20px rgba(6, 214, 160, 0.15)',
        'av-glow-strong': '0 0 40px rgba(6, 214, 160, 0.25)',
        'av-glow-accent': '0 0 20px rgba(76, 201, 240, 0.15)',
      },
      borderRadius: {
        'av-sm': '6px',
        'av-md': '10px',
        'av-lg': '14px',
        'av-xl': '18px',
        'av-full': '9999px',
      },
      animation: {
        'fade-in': 'fadeIn 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scaleIn 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'grid-move': 'gridMove 20s linear infinite',
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
        'status-glow': 'statusGlow 2.5s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(6, 214, 160, 0.1)' },
          '50%': { boxShadow: '0 0 30px rgba(6, 214, 160, 0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        gridMove: {
          from: { backgroundPosition: '0 0' },
          to: { backgroundPosition: '60px 60px' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        statusGlow: {
          '0%, 100%': { boxShadow: '0 0 6px rgba(6, 214, 160, 0.3)' },
          '50%': { boxShadow: '0 0 14px rgba(6, 214, 160, 0.5)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        xl: '24px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'monospace'],
      },
      fontSize: {
        'av-xs': '0.75rem',
        'av-sm': '0.8125rem',
        'av-base': '0.875rem',
        'av-lg': '1rem',
        'av-xl': '1.25rem',
        'av-2xl': '1.5rem',
        'av-3xl': '2rem',
      },
      transitionDuration: {
        av: '200ms',
        'av-slow': '300ms',
      },
      spacing: {
        'av-1': '4px',
        'av-2': '8px',
        'av-3': '12px',
        'av-4': '16px',
        'av-5': '20px',
        'av-6': '24px',
        'av-8': '32px',
        'av-10': '40px',
        'av-12': '48px',
      },
    },
  },
  plugins: [],
}
```

---

## 三、全局 CSS（完整 index.css）

```css
/* ========================================
   AI短视频脚本平台 — 科技感暗色主题
   ======================================== */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── CSS Custom Properties ── */
:root {
  /* ── Color System ── */
  --color-bg-primary: #08090d;
  --color-bg-secondary: #0f1117;
  --color-bg-tertiary: #161822;
  --color-bg-elevated: #1c1f2e;
  --color-bg-hover: #232738;
  --color-bg-active: #2a2f42;

  --color-border-default: #1e2233;
  --color-border-subtle: #181b28;
  --color-border-strong: #2a2f45;
  --color-border-focus: #06d6a0;

  --color-text-primary: #e8ecf4;
  --color-text-secondary: #8892a8;
  --color-text-tertiary: #5a6478;
  --color-text-inverse: #08090d;

  /* Brand Primary — Cyan/Mint */
  --color-primary: #06d6a0;
  --color-primary-hover: #34e0b5;
  --color-primary-muted: rgba(6, 214, 160, 0.10);
  --color-primary-subtle: rgba(6, 214, 160, 0.05);

  /* Secondary Accent — Electric Blue */
  --color-accent: #4cc9f0;
  --color-accent-muted: rgba(76, 201, 240, 0.10);

  /* State Colors */
  --state-success: #06d6a0;
  --state-warning: #ffd166;
  --state-error: #ef476f;
  --state-info: #4cc9f0;

  /* ── Typography ── */
  --font-display: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.8125rem;
  --text-base: 0.875rem;
  --text-lg: 1rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 2rem;

  --leading-tight: 1.25;
  --leading-normal: 1.5;

  --tracking-tight: -0.02em;
  --tracking-normal: 0;

  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* ── Spacing ── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* ── Radius ── */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --radius-full: 9999px;

  /* ── Shadows ── */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.05);
  --shadow-floating: 0 12px 40px rgba(0, 0, 0, 0.4);

  --shadow-glow: 0 0 20px rgba(6, 214, 160, 0.15);
  --shadow-glow-strong: 0 0 40px rgba(6, 214, 160, 0.25);
  --shadow-glow-accent: 0 0 20px rgba(76, 201, 240, 0.15);

  /* ── Transitions ── */
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --duration: 200ms;
  --duration-slow: 300ms;

  /* ── Z-index ── */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal: 300;
  --z-toast: 400;
}

/* ── Dark mode defaults ── */
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

/* ── Typography ── */
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
.mono {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

/* ── Surface & Card ── */
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

/* ── Gradient accents ── */
.gradient-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
}
.gradient-text {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Glow effects ── */
.glow-primary { box-shadow: var(--shadow-glow); }
.glow-strong { box-shadow: var(--shadow-glow-strong); }
.glow-accent { box-shadow: var(--shadow-glow-accent); }

/* ── Neon border effect ── */
.neon-border {
  border: 1px solid rgba(6, 214, 160, 0.2);
  box-shadow: inset 0 0 20px rgba(6, 214, 160, 0.03);
}
.neon-border-accent {
  border: 1px solid rgba(76, 201, 240, 0.2);
  box-shadow: inset 0 0 20px rgba(76, 201, 240, 0.03);
}

/* ── Grid background pattern ── */
.grid-bg {
  background-image:
    linear-gradient(rgba(6, 214, 160, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(6, 214, 160, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* ── Glassmorphism utilities ── */
.glass {
  background: rgba(15, 17, 23, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.glass-bg {
  background: rgba(15, 17, 23, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.glass-bg-light {
  background: rgba(15, 17, 23, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

/* ── Video Card ── */
.video-card {
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1),
              border-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
.video-card:hover {
  transform: translateY(-2px);
}
.video-card:hover .card-actions {
  opacity: 1;
}
.card-actions {
  opacity: 0;
  transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── Thumbnail gradients ── */
.thumb-gradient-1 {
  background: linear-gradient(160deg, #0a2e2e 0%, #0d1b2a 50%, #08090d 100%);
}
.thumb-gradient-2 {
  background: linear-gradient(160deg, #1a1040 0%, #0d1b2a 50%, #08090d 100%);
}
.thumb-gradient-3 {
  background: linear-gradient(160deg, #0a2e2e 0%, #101830 50%, #08090d 100%);
}
.thumb-gradient-4 {
  background: linear-gradient(160deg, #1a1040 0%, #0a1e30 50%, #08090d 100%);
}
.thumb-gradient-5 {
  background: linear-gradient(160deg, #0d2a20 0%, #0d1b2a 60%, #08090d 100%);
}
.thumb-pattern {
  background-image:
    radial-gradient(circle at 20% 30%, rgba(6, 214, 160, 0.06) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(76, 201, 240, 0.04) 0%, transparent 50%);
}
.thumb-pattern-2 {
  background-image:
    radial-gradient(circle at 70% 20%, rgba(76, 201, 240, 0.06) 0%, transparent 50%),
    radial-gradient(circle at 30% 80%, rgba(6, 214, 160, 0.04) 0%, transparent 50%);
}
.bottom-gradient {
  background: linear-gradient(to top, rgba(8, 9, 13, 0.85) 0%, transparent 60%);
}

/* ── Sort pill active ── */
.sort-pill-active {
  background: var(--color-primary-muted);
  color: var(--color-primary);
  box-shadow: var(--shadow-glow);
}

/* ── Nav pill active ── */
.nav-pill-active {
  background: var(--color-primary-muted);
  color: var(--color-primary);
  box-shadow: var(--shadow-glow);
}

/* ── Ghost Button ── */
.ghost-btn {
  transition: color 160ms cubic-bezier(0.4, 0, 0.2, 1),
              background-color 160ms cubic-bezier(0.4, 0, 0.2, 1);
}
.ghost-btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-hover);
}

/* ── Gradient primary button ── */
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

/* ── Tag pill ── */
.tag-pill {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-subtle);
  transition: background-color 160ms cubic-bezier(0.4, 0, 0.2, 1);
}
.tag-pill:hover {
  background-color: var(--color-bg-hover);
}

/* ── Collection card ── */
.collection-card {
  transition: transform var(--duration) var(--ease), box-shadow var(--duration) var(--ease), border-color var(--duration) var(--ease);
}
.collection-card:hover {
  transform: translateY(-1px);
}
.collection-card .delete-btn {
  opacity: 0;
  transition: opacity 160ms var(--ease);
}
.collection-card:hover .delete-btn {
  opacity: 1;
}

/* ── Storyboard card ── */
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

/* ── Nav pill ── */
.nav-pill {
  transition: background-color var(--duration) var(--ease), box-shadow var(--duration) var(--ease);
}

/* ── Search card ── */
.search-card {
  transition: border-color var(--duration) var(--ease), box-shadow var(--duration) var(--ease);
}

/* ── Scrollbar ── */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--color-border-strong);
  border-radius: var(--radius-full);
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

/* ── Animations ── */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 15px rgba(6, 214, 160, 0.1); }
  50% { box-shadow: 0 0 30px rgba(6, 214, 160, 0.2); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes gridMove {
  0% { background-position: 0 0; }
  100% { background-position: 60px 60px; }
}
@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}
@keyframes pulseDot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes statusGlow {
  0%, 100% { box-shadow: 0 0 6px rgba(6, 214, 160, 0.3); }
  50% { box-shadow: 0 0 14px rgba(6, 214, 160, 0.5); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-fade-in { animation: fadeIn var(--duration) var(--ease); }
.animate-slide-up { animation: slideUp var(--duration-slow) var(--ease); }
.animate-scale-in { animation: scaleIn var(--duration-slow) var(--ease); }
.animate-glow-pulse { animation: glowPulse 3s ease-in-out infinite; }
.animate-float { animation: float 4s ease-in-out infinite; }
.animate-grid-move { animation: gridMove 20s linear infinite; }
.pulse-dot { animation: pulseDot 1.5s ease-in-out infinite; }
.status-glow { animation: statusGlow 2.5s ease-in-out infinite; }

/* ── Focus visible ── */
*:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

/* ── Skeleton loading ── */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-tertiary) 25%,
    var(--color-bg-hover) 50%,
    var(--color-bg-tertiary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 2s ease-in-out infinite;
  border-radius: var(--radius-md);
}

/* ── Text gradient utility ── */
.text-gradient {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── No scrollbar utility ── */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .video-card,
  .collection-card,
  .storyboard-card,
  .btn-gradient-primary,
  .pulse-dot,
  .status-glow,
  .animate-glow-pulse,
  .animate-float,
  .animate-grid-move {
    transition: none;
    animation: none;
  }
}
```

---

## 四、Header 组件（完整 TSX）

```tsx
// src/components/Header.tsx
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useState } from 'react'
import type { User } from '../types'
import { videoApi } from '../store/videoApi'
import { logout, updateCredits } from '../store/authSlice'

interface HeaderProps {
  user: User
}

const navItems = [
  { path: '/square', label: '广场' },
  { path: '/library', label: '素材库' },
  { path: '/storyboards', label: '脚本' },
]

export default function Header({ user }: HeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const [checkinOpen, setCheckinOpen] = useState(false)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const handleCheckin = async () => {
    try {
      const res = await videoApi.checkin()
      dispatch(updateCredits(res.credits))
      setCheckinOpen(false)
    } catch (err) {
      console.error('签到失败', err)
    }
  }

  return (
    <nav className="sticky top-0 z-40 h-16 flex items-center justify-between px-8"
         style={{
           background: 'rgba(15, 17, 23, 0.8)',
           backdropFilter: 'blur(24px)',
           WebkitBackdropFilter: 'blur(24px)',
           borderBottom: '1px solid var(--color-border-subtle)',
         }}>
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
          {/* Play circle icon — Logo */}
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-inverse)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <span className="font-semibold text-base tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          AI短视频
        </span>
      </div>

      {/* Center: Nav Pills */}
      <div className="flex items-center gap-1 rounded-full px-1 py-1" style={{ background: 'rgba(22, 24, 34, 0.6)' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => { e.preventDefault(); navigate(item.path) }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
                isActive ? 'nav-pill-active' : ''
              }`}
              style={!isActive ? { color: 'var(--color-text-secondary)' } : undefined}
            >
              {item.label}
            </a>
          )
        })}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Credits Badge */}
        <div className="relative">
          <button
            onClick={() => setCheckinOpen(!checkinOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer"
            style={{
              background: 'rgba(22, 24, 34, 0.6)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            {/* Star icon */}
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--color-text-secondary)' }}>
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {user.credits}
            </span>
          </button>

          {/* Checkin Dropdown */}
          {checkinOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl p-3 z-50"
                 style={{
                   background: 'var(--color-bg-elevated)',
                   border: '1px solid var(--color-border-default)',
                   boxShadow: 'var(--shadow-floating)',
                 }}>
              <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                每日签到领取积分
              </p>
              <button
                onClick={handleCheckin}
                className="w-full gradient-primary text-sm font-semibold py-2 rounded-lg cursor-pointer"
                style={{ color: 'var(--color-text-inverse)', border: 'none' }}
              >
                立即签到
              </button>
            </div>
          )}
        </div>

        {/* Ghost Button: 链接提取 */}
        <button className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer"
                style={{
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-subtle)',
                  background: 'transparent',
                }}
                onClick={() => navigate('/link-extract')}>
          链接提取
        </button>

        {/* Primary Button: 上传视频 */}
        <button className="px-4 py-1.5 rounded-lg text-sm font-semibold gradient-primary hover:opacity-90 transition-opacity duration-200 cursor-pointer"
                style={{ color: 'var(--color-text-inverse)', border: 'none' }}
                onClick={() => navigate('/upload')}>
          上传视频
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold gradient-primary cursor-pointer"
             style={{ color: 'var(--color-text-inverse)' }}>
          {user.username?.charAt(0)?.toUpperCase() || 'U'}
        </div>

        {/* Logout */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 cursor-pointer"
          style={{ color: 'var(--color-text-tertiary)', background: 'transparent', border: 'none' }}
          onClick={handleLogout}
          aria-label="退出登录"
        >
          {/* Logout icon */}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </button>
      </div>
    </nav>
  )
}
```

---

## 五、VideoCard 组件（完整 TSX）

```tsx
// src/components/VideoCard.tsx
import { useState } from 'react'

export interface VideoCardProps {
  id: number
  title: string
  author: string
  timeAgo: string
  status: 'processing' | 'completed' | 'failed'
  collectCount: number
  tags: string[]
  thumbnailGradient?: number // 1-5, maps to thumb-gradient-{n}
  onCollect?: (id: number) => void
  onDelete?: (id: number) => void
  onClick?: (id: number) => void
}

const gradientClasses = [
  'thumb-gradient-1',
  'thumb-gradient-2',
  'thumb-gradient-3',
  'thumb-gradient-4',
  'thumb-gradient-5',
]
const patternClasses = ['thumb-pattern', 'thumb-pattern-2']

export default function VideoCard({
  id,
  title,
  author,
  timeAgo,
  status,
  collectCount,
  tags,
  thumbnailGradient = 1,
  onCollect,
  onDelete,
  onClick,
}: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const gradient = gradientClasses[(thumbnailGradient - 1) % 5]
  const pattern = patternClasses[(thumbnailGradient - 1) % 2]

  const statusBadge = () => {
    if (status === 'processing') {
      return (
        <span className="glass-bg-light px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--color-primary)' }} />
          处理中
        </span>
      )
    }
    if (status === 'completed') {
      return (
        <span className="glass-bg-light px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--color-primary)' }}>
          {/* Check icon */}
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          已完成
        </span>
      )
    }
    return (
      <span className="glass-bg-light px-2 py-0.5 rounded-md text-xs font-medium" style={{ color: 'var(--state-error)' }}>
        失败
      </span>
    )
  }

  return (
    <article
      className={`video-card rounded-xl overflow-hidden cursor-pointer ${isHovered ? 'neon-border' : ''}`}
      style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-subtle)',
        boxShadow: isHovered ? 'var(--shadow-glow)' : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(id)}
    >
      {/* Thumbnail Area — 9:16 aspect ratio */}
      <div className={`relative aspect-[9/16] ${gradient} ${pattern}`}>
        {/* Status + Collect Badge */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {statusBadge()}
          <span className="glass-bg-light px-2 py-0.5 rounded-md text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {'\u2661'} {collectCount}
          </span>
        </div>

        {/* Hover Actions */}
        <div className="card-actions absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
          {/* Collect button */}
          <button
            className="w-7 h-7 rounded-full glass-bg-light flex items-center justify-center transition-colors duration-200 cursor-pointer"
            style={{ color: 'var(--color-text-secondary)', background: 'transparent', border: 'none' }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            onClick={(e) => { e.stopPropagation(); onCollect?.(id) }}
            aria-label="收藏"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </button>
          {/* Delete button */}
          <button
            className="w-7 h-7 rounded-full glass-bg-light flex items-center justify-center transition-colors duration-200 cursor-pointer"
            style={{ color: 'var(--color-text-secondary)', background: 'transparent', border: 'none' }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            onClick={(e) => { e.stopPropagation(); onDelete?.(id) }}
            aria-label="删除"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Play Icon — Center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full glass-bg flex items-center justify-center">
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-primary)' }}>
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        {/* Bottom Gradient — Title + Meta */}
        <div className="absolute bottom-0 left-0 right-0 bottom-gradient p-3 pt-10">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {timeAgo} · {author}
          </p>
        </div>
      </div>

      {/* Tags Row */}
      <div className="px-3 py-2.5 flex gap-1.5 flex-wrap">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full text-xs"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
          >
            {tag}
          </span>
        ))}
      </div>
    </article>
  )
}
```

---

## 六、LoginPage（完整 TSX）

```tsx
// src/pages/LoginPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      // ... login logic
      navigate('/square')
    } catch (err) {
      setError('用户名或密码错误')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Full-screen background layers */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Animated grid pattern */}
        <div className="absolute inset-0 grid-bg animate-grid-move" />

        {/* Center radial gradient glow */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(6,214,160,0.06) 0%, transparent 60%)' }} />

        {/* Scanline effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-0 w-full" style={{
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(6,214,160,0.08), transparent)',
            animation: 'scanline 8s linear infinite',
          }} />
        </div>

        {/* Floating gradient orb — top right */}
        <div className="absolute -top-32 -right-32 rounded-full animate-float" style={{
          width: '400px',
          height: '400px',
          background: 'var(--color-primary-muted)',
          filter: 'blur(100px)',
          animationDelay: '0s',
        }} />

        {/* Floating gradient orb — bottom left */}
        <div className="absolute -bottom-32 -left-32 rounded-full animate-float" style={{
          width: '350px',
          height: '350px',
          background: 'var(--color-accent-muted)',
          filter: 'blur(100px)',
          animationDelay: '2s',
        }} />

        {/* Subtle particle dots */}
        <div className="absolute top-[12%] left-[8%] w-1 h-1 rounded-full" style={{ background: 'var(--color-primary)', opacity: 0.3 }} />
        <div className="absolute top-[25%] right-[15%] w-0.5 h-0.5 rounded-full" style={{ background: 'var(--color-accent)', opacity: 0.25 }} />
        <div className="absolute top-[60%] left-[5%] w-0.5 h-0.5 rounded-full" style={{ background: 'var(--color-primary)', opacity: 0.2 }} />
        <div className="absolute bottom-[20%] right-[10%] w-1 h-1 rounded-full" style={{ background: 'var(--color-accent)', opacity: 0.2 }} />
      </div>

      {/* Main content */}
      <main className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-md animate-slide-up">
          {/* Logo + Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-primary animate-glow-pulse flex items-center justify-center mb-4">
              {/* Layers icon — Logo */}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1 className="heading-xl gradient-text" style={{ textWrap: 'balance', wordBreak: 'keep-all' }}>
              AI短视频脚本平台
            </h1>
          </div>

          {/* Login Card */}
          <div className="neon-border rounded-xl p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <div className="mb-6">
              <h2 className="heading-md mb-1" style={{ color: 'var(--color-text-primary)', textWrap: 'balance', wordBreak: 'keep-all' }}>
                登录到您的账户
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                使用您的账户继续创作
              </p>
            </div>

            {/* Error state */}
            {error && (
              <div className="mb-5 px-4 py-3 rounded-lg" style={{
                background: 'rgba(239, 71, 111, 0.1)',
                borderLeft: '3px solid var(--state-error)',
              }}>
                <p className="text-sm" style={{ color: 'var(--state-error)' }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  用户名
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="输入用户名"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border-default)',
                    color: 'var(--color-text-primary)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border-focus)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(6,214,160,0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border-default)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  密码
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="输入密码"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 pr-11"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border-default)',
                      color: 'var(--color-text-primary)',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border-focus)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(6,214,160,0.1)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border-default)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    type="button"
                    aria-label="切换密码可见性"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity duration-200"
                    style={{ color: 'var(--color-text-tertiary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {/* Eye icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {showPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full gradient-primary rounded-lg py-3 text-sm font-semibold transition-all duration-200 cursor-pointer"
                style={{ color: 'white', border: 'none' }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-glow-strong)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
              >
                {isLoading ? '登录中...' : '登录'}
              </button>
            </form>

            {/* Register link */}
            <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              还没有账户？
              <a
                href="#"
                className="transition-colors duration-200"
                style={{ color: 'var(--color-primary)' }}
                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-primary-hover)')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
              >
                立即注册
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
```

---

## 七、SquarePage 布局

```tsx
// src/pages/SquarePage.tsx — 关键 JSX 结构

// ── Page Header ──
<div className="flex items-center justify-between mb-8">
  <div>
    <h1 className="heading-lg gradient-text" style={{ textWrap: 'balance', wordBreak: 'keep-all' }}>
      短视频广场
    </h1>
    <p className="text-sm mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
      发现热门短视频脚本，激发创作灵感
    </p>
  </div>
  {/* Sort Pills */}
  <div className="flex items-center gap-1 rounded-full px-1 py-1"
       style={{ background: 'rgba(22, 24, 34, 0.6)' }}>
    <button className="sort-pill-active px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer">
      最新
    </button>
    <button className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 cursor-pointer"
            style={{ color: 'var(--color-text-secondary)' }}>
      热门
    </button>
  </div>
</div>

// ── Video Grid ──
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
  {videos.map((video) => (
    <VideoCard key={video.id} {...video} />
  ))}
</div>

// ── Pagination ──
<div className="flex items-center justify-center gap-4 mt-10">
  <button
    className="px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer"
    style={{
      color: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border-subtle)',
      background: 'transparent',
    }}
  >
    上一页
  </button>
  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
    {currentPage} / {totalPages}
  </span>
  <button
    className="px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer"
    style={{
      color: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border-subtle)',
      background: 'transparent',
    }}
  >
    下一页
  </button>
</div>
```

---

## 八、LibraryPage 布局

```tsx
// src/pages/LibraryPage.tsx — 关键 JSX 结构

// ── Page Header ──
<div className="flex items-center justify-between mb-8">
  <h1 className="heading-lg gradient-text">我的素材库</h1>
  <button className="gradient-primary text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
          style={{ color: 'var(--color-text-inverse)', border: 'none' }}>
    {/* Plus icon */}
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    新建收藏夹
  </button>
</div>

// ── 3-Column Layout: Collections (3/4) + Tags Sidebar (1/4) ──
<div className="flex gap-6">
  {/* Collections Section */}
  <section className="flex-1 min-w-0" style={{ flex: 3 }}>
    <h2 className="heading-md mb-5" style={{ color: 'var(--color-text-primary)' }}>收藏夹</h2>
    <div className="grid grid-cols-2 gap-4">
      {collections.map((col) => (
        <div key={col.id} className="collection-card surface rounded-xl p-5 cursor-pointer group">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                 style={{ background: 'var(--color-bg-tertiary)' }}>
              {col.emoji}
            </div>
            <button className="delete-btn p-1.5 rounded-lg transition-colors duration-200 cursor-pointer"
                    style={{ color: 'var(--color-text-tertiary)', background: 'transparent', border: 'none' }}
                    onClick={(e) => { e.stopPropagation(); onDeleteCollection(col.id) }}
                    title="删除收藏夹"
                    aria-label="删除收藏夹">
              {/* X icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <h3 className="font-semibold mt-4 mb-1" style={{ color: 'var(--color-text-primary)' }}>{col.name}</h3>
          <p className="text-sm mb-4 truncate" style={{ color: 'var(--color-text-secondary)' }}>{col.description}</p>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {/* Folder icon */}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>{col.count} 个视频</span>
          </div>
        </div>
      ))}
    </div>
  </section>

  {/* Tags Sidebar */}
  <aside className="w-72 flex-shrink-0 space-y-6" style={{ flex: 1 }}>
    {/* Tags Section */}
    <div>
      <h2 className="heading-md mb-4" style={{ color: 'var(--color-text-primary)' }}>标签</h2>
      <div className="neon-border-accent rounded-xl p-4" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag.name} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors duration-200"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
              #{tag.name}
              <span className="text-xs opacity-60">({tag.count})</span>
            </span>
          ))}
        </div>
      </div>
    </div>

    {/* Quick Search Card */}
    <div>
      <div className="rounded-xl p-4 cursor-pointer"
           style={{
             background: 'var(--color-bg-secondary)',
             border: '1px solid var(--color-border-default)',
           }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: 'var(--color-accent-muted)' }}>
            {/* Search icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                 style={{ color: 'var(--color-accent)' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>搜索素材库</h3>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>关键词、标签、收藏夹</p>
          </div>
        </div>
      </div>
    </div>
  </aside>
</div>
```

---

## 九、StoryboardListPage 布局

```tsx
// src/pages/StoryboardListPage.tsx — 关键 JSX 结构

// ── Page Header ──
<div className="flex items-center justify-between mb-8">
  <div>
    <h1 className="heading-lg gradient-text" style={{ marginBottom: 'var(--space-2)' }}>
      脚本工作台
    </h1>
    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
      管理和编辑你的AI短视频脚本
    </p>
  </div>
  <button className="btn-gradient-primary flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
          style={{ border: 'none' }}>
    {/* Plus icon */}
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    <span>新建脚本</span>
  </button>
</div>

// ── Storyboard List ──
<div className="flex flex-col gap-4">
  {storyboards.map((sb) => (
    <div key={sb.id} className="storyboard-card rounded-xl p-5 flex items-center justify-between"
         style={{
           backgroundColor: 'var(--color-bg-secondary)',
           border: '1px solid var(--color-border-subtle)',
         }}>
      <div className="flex items-center gap-4 min-w-0">
        {/* Status Dot */}
        {sb.status === 'completed' && (
          <div className="w-3 h-3 rounded-full flex-shrink-0 status-glow"
               style={{ backgroundColor: 'var(--state-success)' }} />
        )}
        {sb.status === 'processing' && (
          <div className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse"
               style={{
                 backgroundColor: 'var(--color-accent)',
                 boxShadow: '0 0 8px rgba(76, 201, 240, 0.4)',
               }} />
        )}
        {sb.status === 'draft' && (
          <div className="w-3 h-3 rounded-full flex-shrink-0"
               style={{ backgroundColor: 'var(--color-text-tertiary)' }} />
        )}
        {/* Title + Description */}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {sb.title}
          </h3>
          <p className="text-sm truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {sb.description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
        {/* Tags */}
        <div className="flex items-center gap-1.5">
          {sb.tags.map((tag) => (
            <span key={tag} className="tag-pill px-2 py-0.5 rounded-md text-xs">{tag}</span>
          ))}
        </div>
        {/* Meta */}
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>创建于 {sb.timeAgo}</span>
        {/* Video Count */}
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {/* Video icon */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
          <span>{sb.videoCount}个视频</span>
        </div>
        {/* Actions (hover) */}
        <div className="card-actions flex items-center gap-1">
          <button className="ghost-btn px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}>
            编辑
          </button>
          <button className="ghost-btn px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ color: 'var(--state-error)', border: '1px solid var(--color-border-subtle)' }}>
            删除
          </button>
        </div>
      </div>
    </div>
  ))}
</div>

// ── Empty State CTA ──
{storyboards.length === 0 && (
  <div className="mt-10 rounded-xl p-8 flex flex-col items-center text-center"
       style={{
         backgroundColor: 'rgba(22, 24, 34, 0.5)',
         border: '1px solid var(--color-border-subtle)',
       }}>
    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
         style={{ backgroundColor: 'var(--color-primary-muted)' }}>
      {/* FilePlus icon */}
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
           style={{ color: 'var(--color-primary)' }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="12" y1="18" x2="12" y2="12"></line>
        <line x1="9" y1="15" x2="15" y2="15"></line>
      </svg>
    </div>
    <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
      还没有脚本？创建你的第一个AI短视频脚本
    </p>
    <button className="btn-gradient-primary px-5 py-2 rounded-lg text-sm font-semibold mt-3 cursor-pointer"
            style={{ border: 'none' }}>
      开始创建
    </button>
  </div>
)}
```

---

## 十、共享组件更新

### ConfirmModal

```tsx
// src/components/ConfirmModal.tsx — Glassmorphism 暗色弹窗
import { useEffect } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'default'
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      {/* Glassmorphism backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(8, 9, 13, 0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onCancel}
      />
      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-xl p-6 animate-scale-in"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-default)',
          boxShadow: 'var(--shadow-floating)',
        }}
      >
        <h3 className="heading-md mb-2" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            className="ghost-btn px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
            style={{
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-subtle)',
              background: 'transparent',
            }}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer`}
            style={{
              background: variant === 'danger' ? 'var(--state-error)' : undefined,
              border: 'none',
              color: variant === 'danger' ? 'white' : 'var(--color-text-inverse)',
            }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Toast

```tsx
// src/components/Toast.tsx — Glass dark style
import { useEffect } from 'react'

export interface ToastProps {
  id: string
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  onClose: (id: string) => void
}

const typeColors: Record<string, { border: string; icon: string }> = {
  success: { border: 'var(--color-primary)', icon: 'var(--color-primary)' },
  error: { border: 'var(--state-error)', icon: 'var(--state-error)' },
  warning: { border: 'var(--state-warning)', icon: 'var(--state-warning)' },
  info: { border: 'var(--state-info)', icon: 'var(--state-info)' },
}

export default function Toast({ id, message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  const colors = typeColors[type]

  return (
    <div className="relative rounded-lg p-4 animate-slide-up flex items-center gap-3 min-w-[300px] max-w-[420px]"
         style={{
           background: 'var(--color-bg-elevated)',
           border: `1px solid ${colors.border}`,
           boxShadow: 'var(--shadow-floating)',
           borderLeft: `3px solid ${colors.border}`,
         }}>
      <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: `${colors.icon}20` }} />
      <p className="text-sm flex-1" style={{ color: 'var(--color-text-primary)' }}>{message}</p>
      <button
        className="p-1 rounded cursor-pointer flex-shrink-0"
        style={{ color: 'var(--color-text-tertiary)', background: 'transparent', border: 'none' }}
        onClick={() => onClose(id)}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  )
}

// Toast container
// Place at root level: <div className="fixed bottom-6 right-6 z-[400] flex flex-col gap-2" />
```

### Pagination

```tsx
// src/components/Pagination.tsx — Pill buttons
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-4 mt-10">
      <button
        className="px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer"
        style={{
          color: currentPage === 1 ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
          border: '1px solid var(--color-border-subtle)',
          background: 'transparent',
          opacity: currentPage === 1 ? 0.5 : 1,
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
        }}
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        上一页
      </button>
      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {currentPage} / {totalPages}
      </span>
      <button
        className="px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer"
        style={{
          color: currentPage === totalPages ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
          border: '1px solid var(--color-border-subtle)',
          background: 'transparent',
          opacity: currentPage === totalPages ? 0.5 : 1,
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
        }}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        下一页
      </button>
    </div>
  )
}
```

---

## 十一、迁移步骤

1. 备份现有文件：`cp tailwind.config.js tailwind.config.js.bak` 以及 `cp src/index.css src/index.css.bak`
2. 更新 `tailwind.config.js`：用第二章完整配置替换
3. 替换 `src/index.css`：用第三章完整 CSS 替换
4. 替换 `src/components/Header.tsx`：用第四章完整组件替换
5. 替换 `src/components/VideoCard.tsx`：用第五章完整组件替换
6. 替换 `src/pages/LoginPage.tsx`：用第六章完整组件替换
7. 更新 `src/pages/SquarePage.tsx`：按第七章结构调整（grid、sort pills、pagination）
8. 更新 `src/pages/LibraryPage.tsx`：按第八章结构调整（3列布局、collection cards、tags sidebar）
9. 更新 `src/pages/StoryboardListPage.tsx`：按第九章结构调整（list cards、status glow、empty state）
10. 更新共享组件（ConfirmModal、Toast、Pagination）：按第十章代码替换

---

> 文档生成时间：2026-06-26 | 所有类名、色值、间距均从 .design 画布导出的 HTML 文件中精确提取。
