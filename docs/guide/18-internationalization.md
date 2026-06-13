# Internationalization (i18n)

## Giới thiệu

9Router hỗ trợ đa ngôn ngữ với 33 locales thông qua runtime i18n system.

## Configuration

**File**: `src/i18n/config.js`

```js
Supported locales (33):
en, vi, zh-CN, zh-TW, ja, pt-BR, pt-PT, ko, es, de, fr,
he, ar, ru, pl, cs, nl, tr, uk, tl, id, th, hi, bn, ur,
ro, sv, it, el, hu, fi, da, no

Default: en
Cookie name: locale
```

## Cách hoạt động

1. Phát hiện locale từ:
   - Cookie `locale`
   - Browser `Accept-Language` header
   - Default `en`

2. Normalize locale với `normalizeLocale()`:
   - Kiểm tra locale có trong supported list
   - Nếu không → fallback về `en`

3. Runtime i18n provider:
   - `src/i18n/RuntimeI18nProvider.js` - React context
   - `src/i18n/runtime.js` - Runtime utilities
   - Tự động cập nhật khi locale thay đổi

## File Structure

```
src/i18n/
├── config.js              # Locale config
├── runtime.js             # Runtime utilities
└── RuntimeI18nProvider.js # React provider component
```
