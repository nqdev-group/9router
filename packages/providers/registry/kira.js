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
      "User-Agent": "KiraAI-Client/1.0",
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
    modelsFetcher: { url: "https://kiraai.vn/api/v1/models", type: "openai" },
  },
  models: [
    { id: "kira-mini-1.0", name: "Kira Mini 1.0 (Miễn phí)" },
    { id: "kira-3.5-flash", name: "Kira 3.5 Flash" },
    { id: "kira-2.5-pro", name: "Kira 2.5 Pro" },
    { id: "kira-2.5-flash", name: "Kira 2.5 Flash" },
    { id: "kira-3-pro-image-preview", name: "Kira 3 Pro Image", type: "image", params: ["n", "size"] },
    { id: "kira-3.1-flash-image-preview", name: "Kira 3.1 Flash Image", type: "image", params: ["n", "size"] },
    { id: "kira-3.1-generate-001", name: "Kira 3.1 Generate", type: "video", params: [] },
  ],
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
