// 前端功能开关（构建期注入，改 .env 后需重启 dev / 重新 build）
export const features = {
  // 注册功能：登录页显示注册入口、/register 路由可用。false 关闭。
  signUp: import.meta.env.VITE_SIGN_UP !== 'false',
  // 用户名注册：注册页显示用户名注册 tab。false 则只保留邮箱注册。
  usernameSignUp: import.meta.env.VITE_USERNAME_SIGN_UP === 'true',
} as const
