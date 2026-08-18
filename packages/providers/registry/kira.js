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
      apiKeyUrl: "https://kiraai.vn/developer/?apiKey=true",
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
    usage: {
      url: "https://kiraai.vn/developer/?usage=true",
      urls: [
        "https://kiraai.vn/developer/?usage=true"
      ]
    },
    // "openai": endpoint returns the standard OpenAI-compatible { data: [...] } shape
    // (verified live) — matches the type used by every other modelsFetcher in this repo;
    // "chat" is not a recognized fetcher type (see src/app/api/providers/suggested-models/filters.js).
    modelsFetcher: { url: "https://kiraai.vn/api/v1/models", type: "openai" },
  },
  models: [
    { id: "kira-mini-1.0", name: "Kira Mini 1.0 (Miễn phí)" },
    { id: "deepseek-v4-pro-free", name: "DeepSeek V4 Pro Free (Miễn phí)" },
    { id: "deepseek-v4-flash-free", name: "DeepSeek V4 Flash Free (Miễn phí)" },
    { id: "deepseek-v4-pro-1b-free", name: "DeepSeek V4 Pro 1B Free (Miễn phí)" },
    { id: "deepseek-v4-flash-1b-free", name: "DeepSeek V4 Flash 1B Free (Miễn phí)" },
    { id: "qwen-3.8-27b-free", name: "Qwen3.8 27B Free (Miễn phí)" },
    { id: "qwen-3.8-max-free", name: "Qwen3.8 Max Free (Miễn phí)" },
    // id corrected: live API (https://kiraai.vn/api/v1/models) has no "kira-2.0" —
    // the actual id is "kira-mini-2.0".
    { id: "kira-mini-2.0", name: "Kira Mini 2.0" },
    { id: "kira-3.0-image", name: "Kira 3.0 Image", type: "image", params: ["n", "size"] },
    { id: "kira-3-pro-image-preview", name: "Kira 3 Pro Image", type: "image", params: ["n", "size"] },
    { id: "kira-3.1-flash-image-preview", name: "Kira 3.1 Flash Image", type: "image", params: ["n", "size"] },
    { id: "kira-3.0-video", name: "Kira 3.0 Video", type: "video", params: [] },
    { id: "kira-3.0-video-flash", name: "Kira 3.0 Video Flash", type: "video", params: [] },
  ],
  // Live catalog (https://kiraai.vn/api/v1/models) has ~40 more chat models beyond this
  // seed (Claude, GPT-5.x, Gemini, Qwen, Kimi, GLM, Grok, MiMo tiers — see
  // packages/providers/pricing.js's "kira" block for the full priced list). passthroughModels
  // lets users pick any of them via modelsFetcher-driven suggestions without listing every
  // id here.
  passthroughModels: true,
  // ── Service kinds ────────────────────────────────────────────────────────
  serviceKinds: ["llm", "image", "video", "tts"],
  ttsConfig: {
    baseUrl: "https://kiraai.vn/api/v1/audio/speech",
    authType: "apikey",
    authHeader: "bearer",
    format: "openai",
    models: [
      { id: "kira-2.5-flash", name: "Kira 2.5 Flash (TTS)" },
    ],
    voices: [
      { id: "Kore", name: "Kore" },
      { id: "Fenrir", name: "Fenrir" },
      { id: "Puck", name: "Puck" },
      { id: "Charon", name: "Charon" },
      { id: "Aoede", name: "Aoede" },
    ],
  },
  imageConfig: {
    baseUrl: "https://kiraai.vn/api/v1/images/generations",
  },
};
