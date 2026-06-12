import { DEFAULT_KEYWORDS } from './constants.js';
import { maskString } from './masking.js';

const EMAIL_REGEX = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/gi;

export class PrivacyEngine {
  constructor(options = {}) {
    this.customKeywords = options.customKeywords || [];
    this.enabled = options.enabled !== false;
    this.keywords = [...new Set([...DEFAULT_KEYWORDS, ...this.customKeywords])];
    this.regex = this._buildRegex();
  }

  _buildRegex() {
    // Matches keys followed by delimiters and values
    // Supported formats: key=value, key: value, key là value, "key": "value with spaces"
    const pattern = `(?:${this.keywords.join('|')})\\s*(?:[:=]|l[àa])\\s*(?:"([^"]*)"|'([^']*)'|([^"'\\s]+))`;
    return new RegExp(pattern, 'gi');
  }

  /**
   * Process and mask sensitive data in object or string
   * @param {any} data 
   * @returns {any}
   */
  process(data) {
    if (!this.enabled || !data) return data;

    if (typeof data === 'string') {
      return this._processString(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.process(item));
    }

    if (typeof data === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(data)) {
        if (this._isSensitiveKey(key)) {
          result[key] = typeof value === 'string' ? maskString(value) : value;
        } else {
          result[key] = this.process(value);
        }
      }
      return result;
    }

    return data;
  }

  _processString(str) {
    let result = str.replace(this.regex, (match, quoted, squoted, unquoted) => {
      const value = quoted || squoted || unquoted;
      const masked = maskString(value);
      return match.replace(value, masked);
    });
    result = this._maskEmails(result);
    return result;
  }

  _maskEmails(str) {
    return str.replace(EMAIL_REGEX, (email) => {
      const atIdx = email.indexOf('@');
      if (atIdx <= 0) return email;
      const local = email.slice(0, atIdx);
      const domain = email.slice(atIdx);
      const keepLen = Math.max(1, Math.floor(local.length / 2));
      const masked = local.slice(0, keepLen) + '*'.repeat(local.length - keepLen);
      return masked + domain;
    });
  }

  _isSensitiveKey(key) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    return this.keywords.some(k => normalizedKey.includes(k.toLowerCase().replace(/[^a-z0-9]/g, '')));
  }
}

export default new PrivacyEngine();
