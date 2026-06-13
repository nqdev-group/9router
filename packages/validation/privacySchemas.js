export const MAX_CUSTOM_KEYWORDS = 50;
export const MAX_KEYWORD_LENGTH = 64;
export const KEYWORD_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export const DEFAULT_KEYWORDS = [
  "username", "user_name", "user",
  "password", "pass", "pwd",
  "apikey", "api_key", "api-key",
  "secretkey", "secret_key", "secret",
  "clientsecret", "client_secret",
  "token", "access_token", "refresh_token",
  "cookie", "session",
  "email", "mail",
  "mật khẩu", "mật_khẩu", "matkhau", "mậtkhẩu",
  "tên đăng nhập", "tên_đăng_nhập", "tendangnhap", "tênđăngnhập",
  "tài khoản", "tài_khoản", "taikhoan", "tàikhoản",
];

export function validatePrivacyConfig(config) {
  const errors = [];
  if (config.privacyEnabled !== undefined && typeof config.privacyEnabled !== "boolean") {
    errors.push("privacyEnabled must be a boolean");
  }
  if (config.privacyCustomKeywords !== undefined) {
    if (!Array.isArray(config.privacyCustomKeywords)) {
      errors.push("privacyCustomKeywords must be an array");
    } else {
      if (config.privacyCustomKeywords.length > MAX_CUSTOM_KEYWORDS) {
        errors.push(`privacyCustomKeywords exceeds max ${MAX_CUSTOM_KEYWORDS} items`);
      }
      const invalid = config.privacyCustomKeywords.filter(
        kw => typeof kw !== "string" || kw.length > MAX_KEYWORD_LENGTH || !KEYWORD_REGEX.test(kw)
      );
      if (invalid.length > 0) {
        errors.push(`Invalid keywords: ${invalid.join(", ")}. Must match ${KEYWORD_REGEX}, max ${MAX_KEYWORD_LENGTH} chars`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}
