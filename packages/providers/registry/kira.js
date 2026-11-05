/* eslint-disable import/no-anonymous-default-export */
export default {
  // ── identity ────────────────────────────────────────────────────────────
  id: "kira",
  alias: "kira",
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
      // Tiers from kiraai.vn/models/; beyond the quota, per-model pricing applies (pricing.js "kira").
      text: "Đăng ký nhận 50.000 token miễn phí. Gói Cá nhân 5.000.000 token/tháng, gói Dev 12.000.000 token/tháng — vượt hạn mức tính theo giá từng model.",
      apiKeyUrl: "https://kiraai.vn/developer/",
      // Signup is a homepage modal (no /sign-up path); ?ref= is the affiliate param.
      signupUrl: "https://kiraai.vn/?ref=nguyenquyitpro",
    },
  },
  // ── transport (HTTP runtime) → PROVIDERS[id] ─────────────────────────────
  transport: {
    baseUrl: "https://kiraai.vn/api/v1/chat/completions",
    // format: "openai",            // "openai" | "claude" | "gemini" | "openai-responses" | ...
    validateUrl: "https://kiraai.vn/api/v1/models",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
    },
    retry: { 429: { attempts: 6 }, 503: { attempts: 3 } },
    // Not wired (future PR): POST /api/v1/responses (Responses API, SSE; needs a dedicated executor
    // like github.js's `responsesUrl`) and the authenticated /user/* routes (profile, usage/logs, keys).
    // Checked 2026-09-17 at kiraai.vn/documents/.
    //
    // Reference links for humans; the live usage fetch is packages/providers/usage/kira.js.
    usage: {
      url: "https://kiraai.vn/developer/",
      // Source of the per-model rates in pricing.js's "kira" block.
      pricingUrl: "https://kiraai.vn/bang-gia/",
    },
    // Standard OpenAI { data: [...] } shape (verified 2026-09-03); "chat" is not a valid fetcher type.
    modelsFetcher: { url: "https://kiraai.vn/api/v1/models", type: "openai" },
  },
  models: [
    // Free chat model (is_free:true in /api/v1/models, 2026-09-18). qwen3.8-flash, hy3, glm-5.3-flash
    // and mimo-v2.5 lost is_free:true (now 80-90% off, not $0) so lost the "(Miễn phí)" tag; a
    // discount is not the same guarantee, and either status can flip.
    { id: "kira-mini-1.0", name: "Kira Mini 1.0 (Miễn phí)" },
    // Paid highlights. Dead ids removed (2026-09-18): the "-free" DeepSeek/Qwen ids, kira-auto,
    // kira-2.0, claude-sonnet-5 — still reachable via passthroughModels if they return.
    { id: "qwen3.8-flash", name: "Qwen3.8 Flash" },
    { id: "hy3", name: "Tencent: Hy3" },
    { id: "glm-5.3-flash", name: "GLM 5.3 Flash" },
    { id: "mimo-v2.5", name: "MiMo V2.5" },
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "deepseek-v4-flash-vision-exp", name: "DeepSeek V4 Flash Vision Exp" },
    { id: "qwen3.8-max", name: "Qwen3.8 Max" },
    { id: "kira-3.0-image", name: "Kira 3.0 Image", type: "image", params: ["n", "size"] },
    { id: "kira-2.0-image", name: "Kira 2.0 Image", type: "image", params: ["n", "size"] },
    { id: "kira-3.0-video", name: "Kira 3.0 Video", type: "video", params: [] },
    { id: "kira-3.0-video-flash", name: "Kira 3.0 Video Flash", type: "video", params: [] },
  ],
  // The live catalog has ~35 more chat models (full priced list: pricing.js "kira", synced 2026-09-18).
  // No Gemini/GPT models remain live (2026-09-18), so the Gemini image/TTS ids were removed.
  // passthroughModels lets users pick any current id via modelsFetcher suggestions.
  passthroughModels: true,
  // ── Service kinds ────────────────────────────────────────────────────────
  // No sttConfig: no STT model/endpoint in the catalog or docs (kiraai.vn/documents/, 2026-09-17);
  // /v1/audio/transcriptions and /v1/stt both 404.
  serviceKinds: ["llm", "image", "video", "tts"],
  ttsConfig: {
    baseUrl: "https://kiraai.vn/api/v1/audio/speech",
    authType: "apikey",
    authHeader: "bearer",
    format: "openai",
    // Real TTS ids (type:"audio" in /api/v1/models, 2026-09-18). "kira-2.5-flash" is a chat model;
    // the old Gemini TTS ids no longer exist.
    models: [
      { id: "kira-3.0-flash-tts", name: "Kira 3.0 Flash TTS" },
      { id: "kira-2.0-flash-tts", name: "Kira 2.0 Flash TTS" },
    ],
    // Voice ids from GET /api/v1/audio/voices (2026-09-17). Its "mapped_to" engine voices
    // (alloy→Kore, echo→Fenrir, fable→Puck, onyx→Charon, nova→Aoede, shimmer→Kore) are mirrored
    // in open-sse/handlers/ttsProviders/kira.js's VOICE_MAP.
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
  // Async video: create at POST {baseUrl}/generations, poll at GET {baseUrl}/operations/{request_id}
  // (confirmed live). videoCore.js's default polls {baseUrl}/{id}, so
  // open-sse/handlers/videoProviders/kira.js is a dedicated adapter sharing this baseUrl.
  videoConfig: {
    baseUrl: "https://kiraai.vn/api/v1/videos",
  },
  // Gates usage fetching for apikey connections (USAGE_APIKEY_PROVIDERS in
  // src/shared/constants/providers.js); the fetch itself is packages/providers/usage/kira.js.
  features: {
    usage: true,
    usageApikey: true,
  },
};
