// eslint-disable-next-line import/no-anonymous-default-export
export default {
  id: "vilao",
  alias: "vilao",
  category: "apikey",
  authType: "apikey",
  display: {
    name: "Vilao AI",
    icon: "storefront",
    color: "#7C3AED",
    textIcon: "VL",
    website: "https://vilao.ai",
    notice: {
      text: "AI Models Marketplace — 300+ model qua 1 API duy nhất tương thích OpenAI. Cần subscribe model trong Marketplace trước khi gọi.",
      apiKeyUrl: "https://vilao.ai/console/llm/keys",
    },
  },
  // ── transport (HTTP runtime) → PROVIDERS[id]
  transport: {
    baseUrl: "https://api.vilao.ai/v1/chat/completions",
    validateUrl: "https://api.vilao.ai/v1/models",
    headers: {
      "Content-Type": "application/json",
      "Accept": "*/*",
    },
  },
  models: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "gpt-4.1", name: "GPT-4.1" },
    { id: "o3", name: "o3" },
    { id: "claude-sonnet-4.6", name: "Claude Sonnet 4.6" },
    { id: "claude-opus-4.6", name: "Claude Opus 4.6" },
    { id: "claude-haiku-4.5", name: "Claude Haiku 4.5" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    { id: "text-embedding-3-small", name: "Text Embedding 3 Small", kind: "embedding" },
  ],
  serviceKinds: ["llm", "embedding"],
  embeddingConfig: { baseUrl: "https://api.vilao.ai/v1/embeddings" },
  modelsFetcher: { url: "https://api.vilao.ai/v1/models", type: "openai" },
  passthroughModels: true,
};
