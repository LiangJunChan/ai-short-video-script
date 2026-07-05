// 密码可见性切换图标 — 共享组件，避免各页面重复定义 (rerender-no-inline-components)
// 使用方式：<EyeIcon visible={showPassword} onClick={() => setShowPassword(!showPassword)} />

import './EyeIcon.css'

interface EyeIconProps {
  visible: boolean
  onClick: () => void
}

export default function EyeIcon({ visible, onClick }: EyeIconProps) {
  return (
    <button
      type="button"
      aria-label="切换密码可见性"
      className="eye-icon-button"
      onClick={onClick}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {visible ? (
          <>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          </>
        ) : (
          <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </svg>
    </button>
  )
}
