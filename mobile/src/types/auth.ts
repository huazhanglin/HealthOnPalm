/** 国家/地区区号选项 */
export interface CountryCodeOption {
  /** 国际区号，如 +86 */
  dialCode: string;
  /** 展示名称 */
  label: string;
}

/** 登录表单状态 */
export interface LoginFormState {
  /** 选中的国际区号 */
  dialCode: string;
  /** 本地手机号（不含区号） */
  phoneNumber: string;
  /** 短信验证码 */
  otp: string;
}

/** 持久化到 localStorage 的用户会话摘要 */
export interface StoredAuthSession {
  /** 用户 ID */
  userId: string;
  /** E.164 格式手机号 */
  phone: string;
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** 过期时间戳（秒） */
  expiresAt: number;
}

/** Auth 相关错误信息 */
export interface AuthErrorInfo {
  /** 用户可读的错误描述 */
  message: string;
  /** Supabase 原始错误码（如有） */
  code?: string;
}

/** localStorage 键名常量 */
export const AUTH_STORAGE_KEY = "health-agent-auth-session";
