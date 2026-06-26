/* eslint-disable import/no-anonymous-default-export */
export default {
  id: "llm7",
  priority: 35,
  hasFree: true,
  alias: "llm7",
  uiAlias: "llm7",
  display: {
    name: "LLM7",
    icon: "bolt",
    color: "#6C3BF5",
    textIcon: "L7",
    website: "https://llm7.io",
    notice: {
      text: "Free token: 1M tokens/day, 2 req/s, 40/min, 100/hr. Get free token at dash.llm7.io → Billing → Access & limits.",
      apiKeyUrl: "https://dash.llm7.io",
      signupUrl: "https://llm7.io",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.llm7.io/v1/chat/completions",
    validateUrl: "https://api.llm7.io/v1/models",
    modelsUrl: "https://api.llm7.io/v1/models",
  },
  models: [
    { id: "default", name: "Default (auto-select)" },
    { id: "codestral-latest", name: "Codestral Latest" },
    { id: "devstral-small-2:24b", name: "Devstral Small 2:24B" },
  ],
  serviceKinds: ["llm", "imageToText"],
  modelsFetcher: { url: "https://api.llm7.io/v1/models", type: "openai" },
  passthroughModels: true,
  features: { usage: true },
};
