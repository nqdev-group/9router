/* eslint-disable import/no-anonymous-default-export */
export default {
  // ── identity ────────────────────────────────────────────────────────────
  id: "opencode-zen",
  alias: "opencode-zen",
  aliases: ["opencodezen", "zen"],
  category: "apikey",
  // ── auth hints (only when relevant) ──────────────────────────────────────
  authType: "apikey",            // "apikey" | "oauth".
  hasOAuth: false,               // true if an OAuth flow exists.
  authModes: ["apikey"],         // e.g. ["oauth","apikey"] when both supported.
  // ── UI display ───────────────────────────────────────────────────────────
  display: {
    name: "OpenCode Zen",
    icon: "smart_toy",
    color: "#10B981",
    textIcon: "OZen",
    website: "https://opencode.ai/zen",
    notice: {
      // Pay-as-you-go: $20 minimum prepaid balance, zero markup, auto top-up
      // when balance drops to $5 (see https://opencode.ai/docs/zen/#pricing).
      text: "Nạp trước tối thiểu $20 (pay-as-you-go, không phụ phí). Có 1 số model miễn phí (giới hạn thời gian).",
      apiKeyUrl: "https://opencode.ai/auth",
      signupUrl: "https://opencode.ai/auth?ref=nguyenquyitpro",
    },
  },
  // ── transport (HTTP runtime) → PROVIDERS[id] ─────────────────────────────
  transport: {
    baseUrl: "https://opencode.ai/zen/v1/chat/completions",
    format: "openai",            // fully OpenAI Chat Completions-compatible
    validateUrl: "https://opencode.ai/zen/v1/models",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
    },
    retry: { 429: { attempts: 6 }, 503: { attempts: 3 } },
    // "openai": endpoint returns the standard OpenAI-compatible { data: [...] } shape
    // (verified live at https://opencode.ai/zen/v1/models).
    modelsFetcher: { url: "https://opencode.ai/zen/v1/models", type: "openai" },
  },
  // Only free-tier models are seeded (cost.text input/output price = 0 in the live catalog,
  // checked 2026-11-05; limited-time per opencode.ai/docs/zen/#pricing). Paid models come via
  // passthroughModels + modelsFetcher, since the catalog rotates. Dropped 2026-11-05 (no longer
  // listed): deepseek-v4-flash-free, x-preview-f-free, muse-spark-1.2-contributor-free,
  // mimo-v2.5-free, hy3-free, nemotron-3-ultra-free, laguna-s-2.1-free.
  models: [
    { id: "big-pickle", name: "Big Pickle (Miễn phí)" },
    { id: "beam-free", name: "Beam Free (Miễn phí)" },
    { id: "flint-40b-free", name: "Flint 40B Free (Miễn phí)" },
    { id: "mimo-v2.6-flash-free", name: "MiMo V2.6 Flash Free (Miễn phí)" },
    { id: "nemotron-3.5-super-vl-free", name: "Nemotron 3.5 Super VL Free (Miễn phí)" },
    { id: "nemotron-3.5-lightning-free", name: "Nemotron 3.5 Lightning Free (Miễn phí)" },
    { id: "deepseek-v4.1-flash-free", name: "DeepSeek V4.1 Flash Free (Miễn phí)" },
    { id: "glm-5.3-flash-free", name: "GLM 5.3 Flash Free (Miễn phí)" },
    { id: "pulse-alpha-free", name: "Pulse Alpha Free (Miễn phí)" },
    { id: "crouton-alpha-free", name: "Crouton Alpha Free (Miễn phí)" },
  ],
  // Live catalog (https://opencode.ai/zen/v1/models) has ~55 more paid chat models beyond
  // this free-tier seed (Claude, GPT-5.x, Gemini, Qwen, Kimi, GLM, Grok, DeepSeek, MiniMax
  // — see packages/providers/pricing.js's "opencode-zen" block for the full priced list).
  // passthroughModels lets users pick any of them via modelsFetcher-driven suggestions
  // without listing every id here.
  passthroughModels: true,
  // ── Service kinds ────────────────────────────────────────────────────────
  serviceKinds: ["llm"],
};
