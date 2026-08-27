/* eslint-disable import/no-anonymous-default-export */
export default {
  // ── identity ────────────────────────────────────────────────────────────
  id: "aimlapi",
  alias: "aimlapi",
  category: "apikey",
  // ── auth hints (only when relevant) ──────────────────────────────────────
  authType: "apikey",            // "apikey" | "oauth".
  hasOAuth: false,               // true if an OAuth flow exists.
  authModes: ["apikey"],         // e.g. ["oauth","apikey"] when both supported.
  // ── UI display ───────────────────────────────────────────────────────────
  display: {
    name: "AI/ML API",
    icon: "smart_toy",
    color: "#0EA5E9",
    textIcon: "AI",
    website: "https://aimlapi.com",
    notice: {
      // gemma-3-27b-it, ling-3.0-tiny, leanstral-1-5, stealth/ox-alpha are all $0/1M
      // token as of writing (see packages/providers/pricing.js's "aimlapi" block) —
      // stealth/ox-alpha is explicitly a temporary free "stealth slot" and may start
      // billing once formally released.
      text: "1000+ model qua 1 API key (OpenAI-compatible). Có sẵn model miễn phí: Gemma 3 27B, Ling 3.0 Tiny, Leanstral 1.5, Stealth Ox Alpha.",
      apiKeyUrl: "https://aimlapi.com/app/keys",
      signupUrl: "https://aimlapi.com/app/keys",
    },
  },
  // ── transport (HTTP runtime) → PROVIDERS[id] ─────────────────────────────
  transport: {
    baseUrl: "https://api.aimlapi.com/v1/chat/completions",
    format: "openai",            // fully OpenAI Chat Completions-compatible
    validateUrl: "https://api.aimlapi.com/v1/models",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
    },
    retry: { 429: { attempts: 6 }, 503: { attempts: 3 } },
    // "usage" isn't wired to a live JSON API — /app/usage is a login-gated dashboard
    // page (no public REST endpoint found in docs), so this is a reference link for
    // humans only, same status as kira.js's usage block.
    usage: {
      url: "https://aimlapi.com/app/usage",
      pricingUrl: "https://aimlapi.com/pricing",
    },
    // "openai": endpoint returns the standard OpenAI-compatible { data: [...] } shape.
    modelsFetcher: { url: "https://api.aimlapi.com/v1/models", type: "openai" },
  },
  models: [
    { id: "google/gemma-3-27b-it", name: "Gemma 3 27B (Miễn phí)" },
    { id: "inclusionai/ling-3.0-tiny", name: "Ling 3.0 Tiny (Miễn phí)" },
    { id: "mistral/leanstral-1-5", name: "Leanstral 1.5 (Miễn phí)" },
    { id: "stealth/ox-alpha", name: "Stealth Ox Alpha (Miễn phí)" },
    { id: "google/gemini-3-pro-image-preview", name: "Gemini 3 Pro Image Preview (Miễn phí)", type: "image", params: ["n", "size"] },
  ],
  // Live catalog (https://api.aimlapi.com/v1/models) has 1000+ more models beyond this
  // small hand-picked seed — passthroughModels lets users pick any of them via
  // modelsFetcher-driven suggestions without listing every id here (same pattern as
  // kira.js / opencode-zen.js).
  passthroughModels: true,
  // ── Service kinds ────────────────────────────────────────────────────────
  serviceKinds: ["llm", "image", "stt"],
  imageConfig: {
    baseUrl: "https://api.aimlapi.com/v1/images/generations",
  },
  // slam-1 (AssemblyAI's model, served via aimlapi) is an async job API — POST
  // /v1/stt/create returns a generation_id, then poll GET /v1/stt/{generation_id}
  // until done. This is NOT a single-request whisper-style endpoint, so it needs a
  // dedicated executor (see AGENTS.md "Provider system") before it's actually callable —
  // this config is metadata only, same status as kira.js's ttsConfig usage note.
  sttConfig: {
    baseUrl: "https://api.aimlapi.com/v1/stt/create",
    authType: "apikey",
    authHeader: "bearer",
    models: [
      { id: "aai/slam-1", name: "Slam 1 (AssemblyAI, English)" },
    ],
  },
};
