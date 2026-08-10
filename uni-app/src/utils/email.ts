/** 简易邮箱校验 */
export function isValidEmail(email: string): boolean {
  const value = email.trim();
  if (!value || value.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** 密码强度：内测至少 6 位（与 Supabase 默认一致） */
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

/** 展示用：取邮箱 @ 前一段 */
export function emailLocalPart(email: string | null | undefined): string {
  if (!email) return "";
  const local = email.trim().split("@")[0] ?? "";
  return local;
}
