/* eslint-disable import/no-anonymous-default-export */
export default {
  // ── identity ────────────────────────────────────────────────────────────
  id: "beatapi",
  alias: "beatapi",
  category: "apikey",
  // ── auth hints (only when relevant) ──────────────────────────────────────
  authType: "apikey",            // "apikey" | "oauth".
  hasOAuth: false,               // true if an OAuth flow exists.
  authModes: ["apikey"],         // e.g. ["oauth","apikey"] when both supported.
  // ── UI display ───────────────────────────────────────────────────────────
  display: {
    name: "BeatAPI",
    icon: "smart_toy",
    color: "#F43F5E",
    textIcon: "BA",
    website: "https://beatapi.io",
    notice: {
      // Per docs.beatapi.io/free-models (2026-11-05): free models work with a zero balance;
      // 1 req/min before first top-up, up to 10/min after; may be withdrawn anytime.
      text: "3 model text miễn phí (đuôi -free), gọi được kể cả khi số dư bằng 0: 1 request/phút trước lần nạp đầu, tối đa 10 request/phút sau khi nạp. Model miễn phí có thể bị gỡ bất cứ lúc nào.",
      apiKeyUrl: "https://beatapi.io/dashboard/apikeys",
      signupUrl: "https://beatapi.io/sign-in",
    },
  },
  // ── transport (HTTP runtime) → PROVIDERS[id] ─────────────────────────────
  transport: {
    baseUrl: "https://api.beatapi.io/v1/chat/completions",
    format: "openai",
    // [nqdev] /v1/models requires a key (401 without one, verified 2026-11-05) → usable to validate keys.
    validateUrl: "https://api.beatapi.io/v1/models",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
    },
    // [nqdev] Free models allow 1 req/min (429 + Retry-After ~60s), so aggressive 429 retries are pointless.
    retry: { 429: { attempts: 2 }, 503: { attempts: 3 } },
    // Human link only; the programmatic fetch is packages/providers/usage/beatapi.js.
    usage: {
      url: "https://beatapi.io/dashboard/text-usage",
    },
    // [nqdev] Public catalog (no key) but double-wrapped { data: { data: [...] } } → custom
    // "beatapi" filter in packages/providers/suggested-models/filters.js.
    modelsFetcher: { url: "https://api.beatapi.io/v1/text/models", type: "beatapi" },
  },
  // Free text models (family "free", docs.beatapi.io/free-models). Send the exact "-free" id —
  // it's separate from the paid sibling. hy4-free's reasoning counts toward max_tokens (docs: use >= 2000).
  models: [
    { id: "glm-5.3-flash-free", name: "GLM 5.3 Flash (Miễn phí)" },
    { id: "deepseek-v4.1-flash-free", name: "DeepSeek V4.1 Flash (Miễn phí)" },
    { id: "hy4-free", name: "Hunyuan 4 (Miễn phí)" },
  ],
  // [nqdev] Paid models come in via modelsFetcher without being listed here.
  passthroughModels: true,
  // ── Service kinds ────────────────────────────────────────────────────────
  // Text/chat only. BeatAPI's image/video/realtime use an async task flow (needs dedicated handlers).
  serviceKinds: ["llm"],
  // [nqdev] Enables usage for apikey connections — see packages/providers/usage/beatapi.js.
  features: {
    usage: true,
    usageApikey: true,
  },
};
