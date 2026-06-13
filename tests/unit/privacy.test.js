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
      username: 'ad***',
      other: 'public info',
      nested: {
        password: 'secret_********'
      }
    };

    const processed = engine.process(data);
    expect(processed.username).toBe('ad***');
    expect(processed.other).toBe('public info');
    expect(processed.nested.password).toBe('secret_********');
  });

  it('should mask sensitive patterns in strings', () => {
    const engine = new PrivacyEngine();
    const content = 'password=secr***** apikey=xyz***';
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

  it('should mask email addresses directly', () => {
    const engine = new PrivacyEngine();
    const content = 'Contact me at test.user@example.com or admin@site.com';
    const processed = engine.process(content);

    expect(processed).not.toContain('test.user@example.com');
    expect(processed).not.toContain('admin@site.com');
    expect(processed).toContain('@example.com');
    expect(processed).toContain('@site.com');
    expect(processed).not.toContain('test.use');
  });

  it('should mask password after Vietnamese "là" delimiter', () => {
    const engine = new PrivacyEngine();
    const content = 'mật khẩu là ExamplePassword123! Và email là user@test.com';
    const processed = engine.process(content);

    expect(processed).not.toContain('ExamplePassword123');
    expect(processed).not.toContain('user@test.com');
  });

  it('should mask email after "là" delimiter', () => {
    const engine = new PrivacyEngine();
    const content = 'email là secret@example.com';
    const processed = engine.process(content);

    expect(processed).not.toContain('secret@example.com');
  });

  it('should mask Vietnamese key-value patterns', () => {
    const engine = new PrivacyEngine();
    const data = {
      tên_đăng_nhập: 'testuser',
      mật_khẩu: 'myPassword123',
    };
    const processed = engine.process(data);

    expect(processed.tên_đăng_nhập).not.toBe('testuser');
    expect(processed.mật_khẩu).not.toBe('myPassword123');
    expect(processed.tên_đăng_nhập).toMatch(/^\w+\*+$/);
    expect(processed.mật_khẩu).toMatch(/^\w+\*+$/);
  });
});
