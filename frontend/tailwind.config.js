/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'monospace'],
      },
      colors: {
        // ── 暗色科技感 av- 体系 (DESIGN_SPEC.md) ──
        'av-bg': {
          primary: '#08090d',
          secondary: '#0f1117',
          tertiary: '#161822',
          elevated: '#1c1f2e',
          hover: '#232738',
          active: '#2a2f42',
        },
        'av-border': {
          DEFAULT: '#1e2233',
          subtle: '#181b28',
          strong: '#2a2f45',
          focus: '#06d6a0',
        },
        'av-text': {
          primary: '#e8ecf4',
          secondary: '#8892a8',
          tertiary: '#5a6478',
          inverse: '#08090d',
        },
        // Brand Primary — 与 LAYOUT_REFERENCE.md 对齐的 av-primary 前缀
        'av-primary': {
          DEFAULT: '#06d6a0',
          hover: '#34e0b5',
          muted: 'rgba(6, 214, 160, 0.10)',
          subtle: 'rgba(6, 214, 160, 0.05)',
        },
        // Brand Accent — 与 LAYOUT_REFERENCE.md 对齐的 av-accent 前缀
        'av-accent': {
          DEFAULT: '#4cc9f0',
          muted: 'rgba(76, 201, 240, 0.10)',
        },
        // State — 平铺形式，与 LAYOUT_REFERENCE.md 对齐
        'av-success': '#06d6a0',
        'av-warning': '#ffd166',
        'av-error': '#ef476f',
        'av-info': '#4cc9f0',
        // 旧别名（兼容期，保留以避免破坏现有 className）
        primary: {
          DEFAULT: '#06d6a0',
          hover: '#34e0b5',
          muted: 'rgba(6, 214, 160, 0.10)',
          subtle: 'rgba(6, 214, 160, 0.05)',
        },
        accent: {
          DEFAULT: '#4cc9f0',
          muted: 'rgba(76, 201, 240, 0.10)',
        },
        'av-state': {
          success: '#06d6a0',
          warning: '#ffd166',
          error: '#ef476f',
          info: '#4cc9f0',
        },
      },
      fontSize: {
        'av-xs': ['0.75rem', { lineHeight: '1.5' }],
        'av-sm': ['0.8125rem', { lineHeight: '1.5' }],
        'av-base': ['0.875rem', { lineHeight: '1.5' }],
        'av-lg': ['1rem', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        'av-xl': ['1.25rem', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        'av-2xl': ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        'av-3xl': ['2rem', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        'av-sm': '6px',
        'av-md': '10px',
        'av-lg': '14px',
        'av-xl': '18px',
        'av-full': '9999px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        // av- 暗色阴影 + 辉光 (基于 #06d6a0)
        'av-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'av-md': '0 4px 12px rgba(0, 0, 0, 0.05)',
        'av-lg': '0 8px 24px rgba(0, 0, 0, 0.05)',
        'av-floating': '0 12px 40px rgba(0, 0, 0, 0.4)',
        'av-glow': '0 0 20px rgba(6, 214, 160, 0.15)',
        'av-glow-strong': '0 0 40px rgba(6, 214, 160, 0.25)',
        'av-glow-accent': '0 0 20px rgba(76, 201, 240, 0.15)',
        'focus-ring': '0 0 0 3px rgba(6, 214, 160, 0.25)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #06d6a0, #4cc9f0)',
        'gradient-radial': 'radial-gradient(ellipse at center, rgba(6,214,160,0.06) 0%, transparent 60%)',
      },
      zIndex: {
        'av-dropdown': '100',
        'av-sticky': '200',
        'av-modal': '300',
        'av-toast': '400',
      },
      transitionTimingFunction: {
        'av': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'av': '200ms',
        'av-slow': '300ms',
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
        '3xl': '64px',
      },
      // 与 LAYOUT_REFERENCE.md 对齐的 av-* spacing token
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
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(6, 214, 160, 0.1)' },
          '50%': { boxShadow: '0 0 30px rgba(6, 214, 160, 0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        blobMove: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(20px, -30px) scale(1.05)' },
          '50%': { transform: 'translate(-10px, 20px) scale(0.95)' },
          '75%': { transform: 'translate(15px, 10px) scale(1.02)' },
        },
        gridMove: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '60px 60px' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        statusGlow: {
          '0%, 100%': { boxShadow: '0 0 6px rgba(6, 214, 160, 0.3)' },
          '50%': { boxShadow: '0 0 14px rgba(6, 214, 160, 0.5)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down': 'slideDown 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scaleIn 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        shimmer: 'shimmer 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        pulse: 'pulse 2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
        'blob-move': 'blobMove 8s ease-in-out infinite',
        'grid-move': 'gridMove 20s linear infinite',
        scanline: 'scanline 8s linear infinite',
        'status-glow': 'statusGlow 2.5s ease-in-out infinite',
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
