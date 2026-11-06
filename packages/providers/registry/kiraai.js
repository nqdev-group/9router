/* eslint-disable import/no-anonymous-default-export */
export default {
  // ── identity ────────────────────────────────────────────────────────────
  id: "kiraai",
  alias: "kiraai",
  category: "apikey",
  // ── auth hints (only when relevant) ──────────────────────────────────────
  authType: "apikey",            // "apikey" | "oauth".
  hasOAuth: false,               // true if an OAuth flow exists.
  authModes: ["apikey"],         // e.g. ["oauth","apikey"] when both supported.
  // ── UI display ───────────────────────────────────────────────────────────
  display: {
    name: "Kira AI",
    icon: "smart_toy",
    color: "#8B5CF6",
    textIcon: "KR",
    website: "https://kiraai.vn",
    notice: {
      // Tiers from kiraai.vn/models/; beyond the quota, per-model pricing applies (pricing.js "kiraai").
      text: "Đăng ký nhận 50.000 token miễn phí. Gói Cá nhân 5.000.000 token/tháng, gói Dev 12.000.000 token/tháng — vượt hạn mức tính theo giá từng model.",
      apiKeyUrl: "https://kiraai.vn/developer/",
      // Signup is a homepage modal (no /sign-up path); ?ref= is the affiliate param.
      signupUrl: "https://kiraai.vn/?ref=nguyenquyitpro",
    },
  },
  // ── transport (HTTP runtime) → PROVIDERS[id] ─────────────────────────────
  transport: {
    baseUrl: "https://kiraai.vn/api/v1/chat/completions",
    validateUrl: "https://kiraai.vn/api/v1/models",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
    },
    retry: { 429: { attempts: 6 }, 503: { attempts: 3 } },
    // Not wired: POST /api/v1/responses (needs its own executor) and the authenticated /user/* routes.
    // Human links only; the live usage fetch is packages/providers/usage/kira.js.
    usage: {
      url: "https://kiraai.vn/developer/",
      // Source of the per-model rates in pricing.js "kiraai".
      pricingUrl: "https://kiraai.vn/bang-gia/",
    },
    // Public, standard OpenAI { data: [...] } shape (re-verified 2026-11-06, 105 models).
    modelsFetcher: { url: "https://kiraai.vn/api/v1/models", type: "openai" },
  },
  models: [
    // Free = is_free:true in /api/v1/models (re-verified 2026-11-06; the same two ids are
    // the only results of /api/v1/user/models?type=free, which is also public).
    // kira-mini-1.0 is is_free:false (priced, 90% off) and the discounted ids below are not $0,
    // so none of them carry the "(Miễn phí)" tag.
    { id: "stealth/crouton-alpha", name: "Crouton Alpha (Miễn phí)" },
    { id: "longcat-2.5-free", name: "Meituan LongCat 2.5 (Miễn phí)" },
    { id: "kira-mini-1.0", name: "Kira Mini 1.0" },
    // Paid highlights (all live 2026-11-06); any other live id works via passthroughModels.
    { id: "qwen3.8-flash", name: "Qwen3.8 Flash" },
    { id: "hy3", name: "Tencent: Hy3" },
    { id: "glm-5.3-flash", name: "GLM 5.3 Flash" },
    { id: "mimo-v2.5", name: "MiMo V2.5" },
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "qwen3.8-max", name: "Qwen3.8 Max" },
    { id: "kira-3.0-image", name: "Kira 3.0 Image", type: "image", params: ["n", "size"] },
    { id: "kira-2.0-image", name: "Kira 2.0 Image", type: "image", params: ["n", "size"] },
    { id: "kira-3.0-video", name: "Kira 3.0 Video", type: "video", params: [] },
    { id: "kira-3.0-video-flash", name: "Kira 3.0 Video Flash", type: "video", params: [] },
  ],
  // The live catalog has ~90 chat models (Claude/GPT/Gemini ids are back since 2026-09); pick via modelsFetcher.
  passthroughModels: true,
  // ── Service kinds ────────────────────────────────────────────────────────
  // No sttConfig: the catalog has no STT model (type is chat|image|video|audio=TTS only).
  serviceKinds: ["llm", "image", "video", "tts"],
  ttsConfig: {
    baseUrl: "https://kiraai.vn/api/v1/audio/speech",
    authType: "apikey",
    authHeader: "bearer",
    format: "openai",
    // type:"audio" ids in /api/v1/models. gemini-*-tts ids also exist now but are not seeded
    // (the voice map in open-sse/handlers/ttsProviders/kira.js is written for the Kira voices).
    models: [
      { id: "kira-3.0-flash-tts", name: "Kira 3.0 Flash TTS" },
      { id: "kira-2.0-flash-tts", name: "Kira 2.0 Flash TTS" },
    ],
    // From GET /api/v1/audio/voices (public). "mapped_to" engine voices are mirrored in
    // open-sse/handlers/ttsProviders/kira.js VOICE_MAP.
    voices: [
      { id: "alloy", name: "Alloy (Nữ, miền Bắc)" },
      { id: "echo", name: "Echo (Nam, miền Bắc)" },
      { id: "fable", name: "Fable (Nữ, miền Nam)" },
      { id: "onyx", name: "Onyx (Nam, miền Nam)" },
      { id: "nova", name: "Nova (Nữ, miền Bắc)" },
      { id: "shimmer", name: "Shimmer (Nữ, miền Bắc)" },
    ],
  },
  imageConfig: {
    baseUrl: "https://kiraai.vn/api/v1/images/generations",
  },
  // Async video: POST {baseUrl}/generations, poll GET {baseUrl}/operations/{request_id};
  // dedicated adapter in open-sse/handlers/videoProviders/kira.js.
  videoConfig: {
    baseUrl: "https://kiraai.vn/api/v1/videos",
  },
  // Enables usage for apikey connections (fetch: packages/providers/usage/kira.js).
  features: {
    usage: true,
    usageApikey: true,
  },
};
