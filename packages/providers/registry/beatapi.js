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
      // Per https://docs.beatapi.io/free-models (checked 2026-11-05): any valid key can call
      // the 3 "-free" text models, even with a zero balance. Limit is 1 successful request/min
      // per account before the first top-up, up to 10/min after. Free models can be withdrawn
      // at any time.
      text: "3 model text miễn phí (đuôi -free), gọi được kể cả khi số dư bằng 0: 1 request/phút trước lần nạp đầu, tối đa 10 request/phút sau khi nạp. Model miễn phí có thể bị gỡ bất cứ lúc nào.",
      apiKeyUrl: "https://beatapi.io/dashboard/apikeys",
      signupUrl: "https://beatapi.io/sign-in",
    },
  },
  // ── transport (HTTP runtime) → PROVIDERS[id] ─────────────────────────────
  transport: {
    // [nqdev] Chat Completions chuẩn OpenAI (xem docs.beatapi.io/free-models, mục "Try one").
    baseUrl: "https://api.beatapi.io/v1/chat/completions",
    format: "openai",
    // [nqdev] /v1/models cần API key (401 missing_api_key khi không gửi key, đã kiểm tra live
    // 2026-11-05) nên dùng làm validateUrl để xác thực key.
    validateUrl: "https://api.beatapi.io/v1/models",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
    },
    // [nqdev] Free model giới hạn 1 request/phút (429 kèm Retry-After ~60s) nên retry 429
    // dày đặc không có ích — giữ ít lần hơn các provider khác.
    retry: { 429: { attempts: 2 }, 503: { attempts: 3 } },
    // Reference link for humans; the programmatic fetch lives in packages/providers/usage/beatapi.js.
    usage: {
      url: "https://beatapi.io/dashboard/text-usage",
    },
    // [nqdev] /v1/text/models là catalog công khai (không cần key) nhưng bọc 2 lớp
    // { data: { object, data: [...] } } — chuẩn "openai" không bóc được, dùng filter "beatapi"
    // (packages/providers/suggested-models/filters.js).
    modelsFetcher: { url: "https://api.beatapi.io/v1/text/models", type: "beatapi" },
  },
  // Seed = 3 free text models from https://docs.beatapi.io/free-models (family "free" in the live
  // catalog, verified 2026-11-05). Each is a separate id from its paid sibling — send the exact
  // "-free" id. Note: hy4-free reasons before answering and the reasoning counts toward
  // max_tokens; docs recommend max_tokens >= 2000.
  models: [
    { id: "glm-5.3-flash-free", name: "GLM 5.3 Flash (Miễn phí)" },
    { id: "deepseek-v4.1-flash-free", name: "DeepSeek V4.1 Flash (Miễn phí)" },
    { id: "hy4-free", name: "Hunyuan 4 (Miễn phí)" },
  ],
  // [nqdev] Cho phép chọn các model trả phí (glm-5.3-flash, deepseek-v4.1-flash, hy4-preview, ...)
  // qua modelsFetcher mà không phải liệt kê hết ở đây.
  passthroughModels: true,
  // ── Service kinds ────────────────────────────────────────────────────────
  // Only text/chat is wired. BeatAPI also has image/video/realtime task APIs, but they use an
  // async task flow (POST .../tasks + GET /v1/tasks/{id}) that needs dedicated handlers.
  serviceKinds: ["llm"],
  // [nqdev] Bật usage cho apikey connection (USAGE_APIKEY_PROVIDERS) — xem
  // packages/providers/usage/beatapi.js (GET /v1/usage → credit_balance).
  features: {
    usage: true,
    usageApikey: true,
  },
};
