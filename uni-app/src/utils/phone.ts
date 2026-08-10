/** 规范化本地号码（不含国际区号） */
export function normalizeLocalPhoneDigits(
  dialCode: string,
  phoneNumber: string
): string {
  let digits = phoneNumber.replace(/\D/g, "");
  const codeDigits = dialCode.replace(/\D/g, "");

  // 用户误填了带区号的完整号码（如 +86 下输入 86138…）
  if (
    codeDigits &&
    digits.startsWith(codeDigits) &&
    digits.length > codeDigits.length + 4
  ) {
    digits = digits.slice(codeDigits.length);
  }

  // 中国大陆 / 香港常见前导 0
  if (dialCode === "+86" || dialCode === "+852") {
    digits = digits.replace(/^0+/, "");
  }

  return digits;
}

/** 组合 E.164 国际手机号 */
export function buildE164Phone(dialCode: string, phoneNumber: string): string {
  const digits = normalizeLocalPhoneDigits(dialCode, phoneNumber);
  const normalizedCode = dialCode.startsWith("+") ? dialCode : `+${dialCode}`;
  return `${normalizedCode}${digits}`;
}

/** 校验本地手机号格式（不含区号） */
export function isValidLocalPhone(phoneNumber: string): boolean {
  const digits = phoneNumber.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 15;
}

/** 校验 6 位数字验证码 */
export function isValidOtp(otp: string): boolean {
  return /^\d{6}$/.test(otp.replace(/\D/g, "").slice(0, 6));
}
