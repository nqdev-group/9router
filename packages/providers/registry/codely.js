/* eslint-disable import/no-anonymous-default-export */
export default {
  // ── identity ────────────────────────────────────────────────────────────
  id: "codely",
  alias: "codely",
  category: "apikey",
  // ── auth hints (only when relevant) ──────────────────────────────────────
  authType: "apikey",            // "apikey" | "oauth".
  hasOAuth: false,               // true if an OAuth flow exists.
  authModes: ["apikey"],         // e.g. ["oauth","apikey"] when both supported.
  // ── UI display ───────────────────────────────────────────────────────────
  display: {
    name: "Codely PixVerse",
    icon: "smart_toy",
    color: "#0EA5E9",
    textIcon: "CD",
    website: "https://codelypixverse.com/dashboard/overview",
    notice: {
      apiKeyUrl: "https://codelypixverse.com/keys",
    },
  },
  // ── transport (HTTP runtime) → PROVIDERS[id] ─────────────────────────────
  transport: {
    baseUrl: "https://codelypixverse.com/v1/chat/completions",
    validateUrl: "https://codelypixverse.com/v1/models",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
    },
    retry: { 429: { attempts: 6 }, 503: { attempts: 3 } },
    modelsFetcher: { url: "https://codelypixverse.com/v1/models", type: "openai" },
  },
  models: [
    { id: "glm-5.2", name: "GLM 5.2" },
    { id: "kimi-k2.7-code", name: "Kimi K2.7 Code" },
    { id: "kiro-auto", name: "Kiro Auto" },
    { id: "minimax-m3", name: "MiniMax M3" },
    // ── image (POST /v1/images/generations) ──────────────────────────────
    { id: "nano-banana-fast", name: "Nano Banana Fast", type: "image", params: ["n", "size"] },
    { id: "nano-banana", name: "Nano Banana", type: "image", params: ["n", "size"] },
    { id: "nano-banana-2", name: "Nano Banana 2", type: "image", params: ["n", "size"] },
    { id: "nano-banana-2-cl", name: "Nano Banana 2 CL", type: "image", params: ["n", "size"] },
    { id: "nano-banana-2-4k-cl", name: "Nano Banana 2 4K CL", type: "image", params: ["n", "size"] },
    { id: "nano-banana-pro", name: "Nano Banana Pro", type: "image", params: ["n", "size"] },
    { id: "nano-banana-pro-cl", name: "Nano Banana Pro CL", type: "image", params: ["n", "size"] },
    { id: "nano-banana-pro-vip", name: "Nano Banana Pro VIP", type: "image", params: ["n", "size"] },
    { id: "nano-banana-pro-4k-vip", name: "Nano Banana Pro 4K VIP", type: "image", params: ["n", "size"] },
    { id: "gpt-image-2", name: "GPT Image 2", type: "image", params: ["n", "size", "quality"] },
    { id: "gpt-image-2-vip", name: "GPT Image 2 VIP", type: "image", params: ["n", "size", "quality"] },
    { id: "gm-nano-banana-pro", name: "GeminiGen Nano Banana Pro", type: "image", params: ["n", "size"] },
    { id: "gm-nano-banana-2", name: "GeminiGen Nano Banana 2", type: "image", params: ["n", "size"] },
    { id: "gm-imagen-4", name: "GeminiGen Imagen 4", type: "image", params: ["n", "size"] },
    // ── video (POST /v1/video/generations, async: poll task_id) ──────────
    { id: "gm-veo-3.1", name: "Veo 3.1", type: "video", params: ["seconds", "size", "aspect_ratio"] },
    { id: "gm-veo-3.1-fast", name: "Veo 3.1 Fast", type: "video", params: ["seconds", "size", "aspect_ratio"] },
    { id: "gm-veo-3.1-lite", name: "Veo 3.1 Lite", type: "video", params: ["seconds", "size", "aspect_ratio"] },
    { id: "gm-veo-2", name: "Veo 2", type: "video", params: ["seconds", "aspect_ratio"] },
    { id: "kling-video-3-0", name: "Kling 3.0", type: "video", params: ["seconds", "aspect_ratio"] },
    { id: "grok-video", name: "Grok Video", type: "video", params: ["size", "seconds"] },
    { id: "seedance-video", name: "Seedance", type: "video", params: ["seconds", "aspect_ratio"] },
  ],
  // ── Service kinds ────────────────────────────────────────────────────────
  serviceKinds: ["llm", "image", "video"],
  imageConfig: {
    baseUrl: "https://codelypixverse.com/v1/images/generations",
  },
  // Async job: POST returns { task_id, status }, GET .../<task_id> polls until
  // status "SUCCESS", result at data.result_url.
  videoConfig: {
    baseUrl: "https://codelypixverse.com/v1/video/generations",
  },
};
