/* eslint-disable import/no-anonymous-default-export */
export default {
  id: "llm7",
  priority: 35,
  alias: "llm7",
  uiAlias: "llm7",
  display: {
    name: "LLM7",
    icon: "bolt",
    color: "#6C3BF5",
    textIcon: "L7",
    website: "https://llm7.io",
    notice: {
      apiKeyUrl: "https://dash.llm7.io",
      signupUrl: "https://llm7.io",
    },
  },
  category: "free",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.llm7.io/v1/chat/completions",
    validateUrl: "https://api.llm7.io/v1/models",
    modelsUrl: "https://api.llm7.io/v1/models",
    headers: {
      "Content-Type": "application/json"
    }
  },
  models: [
    { id: "default", name: "Default (auto-select)" },
    { id: "codestral-latest", name: "Codestral Latest" },
    { id: "devstral-small-2:24b", name: "Devstral Small 2:24b" },
    { id: "fast", name: "Fast (low-latency)" },
    { id: "pro", name: "Pro (high-quality)" },
    { id: "gpt-5.4", name: "GPT-5.4" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  ],
  modelsFetcher: { url: "https://api.llm7.io/v1/models", type: "openai" },
  passthroughModels: true,
  features: { usage: true },
};
