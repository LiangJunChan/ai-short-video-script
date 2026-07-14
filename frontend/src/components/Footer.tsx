// frontend/src/components/Footer.tsx

// 备案号统一管理 —— 拿到号码后只需修改以下 3 个常量
// -----------------------------------------------------------------------------
// ICP_NUMBER: 工信部 ICP 备案号,例如 "京ICP备12345678号-1"
// POLICE_RECORD_CODE: 公安备案号纯数字部分,用于拼接跳转 URL,例如 "11010802012345"
// POLICE_TEXT: 页面上显示的公安备案完整文案,例如 "京公网安备 11010802012345 号"
// -----------------------------------------------------------------------------
const ICP_NUMBER = '粤ICP备2026094795号-1'
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
