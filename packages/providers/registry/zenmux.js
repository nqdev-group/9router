/* eslint-disable import/no-anonymous-default-export */
export default {
  // ── identity ────────────────────────────────────────────────────────────
  id: "zenmux",
  alias: "zenmux",
  category: "apikey",
  // ── auth hints (only when relevant) ──────────────────────────────────────
  authType: "apikey",            // "apikey" | "oauth".
  hasOAuth: false,               // true if an OAuth flow exists.
  authModes: ["apikey"],         // e.g. ["oauth","apikey"] when both supported.
  // ── UI display ───────────────────────────────────────────────────────────
  display: {
    name: "ZenMux",
    icon: "smart_toy",
    color: "#6366F1",
    textIcon: "ZM",
    website: "https://zenmux.ai",
    notice: {
      apiKeyUrl: "https://zenmux.ai/platform/pay-as-you-go",
    },
  },
  // ── transport (HTTP runtime) → PROVIDERS[id] ─────────────────────────────
  transport: {
    baseUrl: "https://zenmux.ai/api/v1/chat/completions",
    format: "openai",            // fully OpenAI Chat Completions-compatible
    validateUrl: "https://zenmux.ai/api/v1/models",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
    },
    retry: { 429: { attempts: 6 }, 503: { attempts: 3 } },
    modelsFetcher: { url: "https://zenmux.ai/api/v1/models", type: "openai" },
  },
  models: [
    { id: "openai/gpt-5.6-luna", name: "GPT-5.6 Luna" },
    { id: "openai/gpt-5.6-sol", name: "GPT-5.6 Sol" },
    { id: "openai/gpt-5.6-terra", name: "GPT-5.6 Terra" },
    { id: "anthropic/claude-opus-5", name: "Claude Opus 5" },
    { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
    { id: "google/gemini-3.6-flash", name: "Gemini 3.6 Flash" },
    { id: "google/gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite" },
    { id: "qwen/qwen3.8-max", name: "Qwen3.8 Max" },
    { id: "qwen/qwen3.7-flash", name: "Qwen3.7 Flash" },
    { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "moonshotai/kimi-k3", name: "Kimi K3" },
    { id: "x-ai/grok-4.5", name: "Grok 4.5" },
    // Free = text models with prompt AND completion price 0 in /api/v1/models (2026-11-05).
    // deepseek/deepseek-v4-flash-free was dropped (no longer listed). Image-output $0 models skipped.
    { id: "z-ai/glm-4.6v-flash-free", name: "Z.AI GLM 4.6V Flash (Miễn phí)" },
    { id: "z-ai/glm-4.7-flash-free", name: "Z.AI GLM 4.7 Flash (Miễn phí)" },
    { id: "atria-asi/atria-dawn", name: "Atria Dawn (Miễn phí)" },
    { id: "dots-studio/dots3-note-prev", name: "Dots3-Note Preview (Miễn phí)" },
    { id: "sapiens-ai/agnes-2.5-flash", name: "Agnes 2.5 Flash (Miễn phí)" },
  ],
  // ── Service kinds ────────────────────────────────────────────────────────
  serviceKinds: ["llm"],
};
