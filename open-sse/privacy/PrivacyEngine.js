import { DEFAULT_KEYWORDS } from './constants.js';
import { maskString } from './masking.js';

export class PrivacyEngine {
  constructor(options = {}) {
    this.customKeywords = options.customKeywords || [];
    this.enabled = options.enabled !== false;
    this.keywords = [...new Set([...DEFAULT_KEYWORDS, ...this.customKeywords])];
    this.regex = this._buildRegex();
  }

  _buildRegex() {
    // Matches keys followed by delimiters and values
    // Supported formats: key=value, key: value, "key": "value with spaces"
    const pattern = `(?:${this.keywords.join('|')})\\s*[:=]\\s*(?:"([^"]*)"|'([^']*)'|([^"'\\s]+))`;
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
    return str.replace(this.regex, (match, quoted, squoted, unquoted) => {
      const value = quoted || squoted || unquoted;
      const masked = maskString(value);
      return match.replace(value, masked);
    });
  }

  _isSensitiveKey(key) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    return this.keywords.some(k => normalizedKey.includes(k.toLowerCase().replace(/[^a-z0-9]/g, '')));
  }
}

export default new PrivacyEngine();
