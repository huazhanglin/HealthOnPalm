/** 持久化到本地存储的用户会话摘要 */
export interface StoredAuthSession {
  /** 用户 ID */
  userId: string;
  /** 登录邮箱 */
  email: string;
  /**
   * 旧版手机号登录遗留字段（兼容读取）
   * @deprecated
   */
  phone?: string;
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

/** localStorage / uni.storage 键名 */
export const AUTH_STORAGE_KEY = "health-agent-auth-session";

/** 本地缓存：是否已完成新手引导（网络拉档案失败时兜底） */
export const ONBOARDING_DONE_KEY = "health-agent-onboarding-done";
