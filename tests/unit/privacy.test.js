import { describe, it, expect } from 'vitest';
import { maskString } from 'open-sse/privacy/masking.js';
import { PrivacyEngine } from 'open-sse/privacy/PrivacyEngine.js';

describe('Privacy Masking', () => {
  it('should mask strings correctly', () => {
    expect(maskString('password123')).toBe('passw******');
    expect(maskString('key')).toBe('k**');
    expect(maskString('ab')).toBe('a*');
  });

  it('should mask sensitive keys in objects', () => {
    const engine = new PrivacyEngine();
    const data = {
      username: 'admin',
      other: 'public info',
      nested: {
        password: 'secret_password'
      }
    };
    
    const processed = engine.process(data);
    expect(processed.username).toBe('ad***');
    expect(processed.other).toBe('public info');
    expect(processed.nested.password).toBe('secret_********');
  });

  it('should mask sensitive patterns in strings', () => {
    const engine = new PrivacyEngine();
    const content = 'password=secret123 apikey=xyz789';
    const processed = engine.process(content);

    expect(processed).toContain('password=secr*****');
    expect(processed).toContain('apikey=xyz***');
  });

  it('should support custom keywords', () => {
    const engine = new PrivacyEngine({ customKeywords: ['customkey'] });
    const data = { customkey: 'val123' };
    const processed = engine.process(data);
    expect(processed.customkey).toBe('val***');
  });
});
