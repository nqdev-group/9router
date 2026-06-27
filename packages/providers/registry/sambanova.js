/* eslint-disable import/no-anonymous-default-export */
export default {
  id: "sambanova",
  priority: 180,
  hasFree: true,
  alias: "sambanova",
  uiAlias: "samba",
  category: "apikey",
  authType: "apikey",
  authModes: ["apikey"],         // e.g. ["oauth","apikey"] when both supported.
  // ── UI display
  display: {
    name: "SambaNova",
    icon: "bolt",
    color: "#4A90D9",
    textIcon: "SN",
    website: "https://cloud.sambanova.ai",
    notice: {
      text: "Permanent free access. Get API key at cloud.sambanova.ai/apis.",
      apiKeyUrl: "https://cloud.sambanova.ai/apis",
    },
  },
  transport: {
    baseUrl: "https://api.sambanova.ai/v1/chat/completions",
    format: "openai",            // "openai" | "claude" | "gemini" | "openai-responses" | ...
    validateUrl: "https://api.sambanova.ai/v1/models",
    headers: { "Content-Type": "application/json" },
    modelsFetcher: { url: "https://api.sambanova.ai/v1/models", type: "openai" }, // dynamic model list.
  },
  models: [
    { id: "DeepSeek-V3.1", name: "DeepSeek V3.1" },
    { id: "DeepSeek-V3.2", name: "DeepSeek V3.2" },
    { id: "Meta-Llama-3.3-70B-Instruct", name: "Llama 3.3 70B" },
    { id: "MiniMax-M2.7", name: "MiniMax M2.7" },
    { id: "gemma-4-31B-it", name: "gemma 4 31B it" },
    { id: "gpt-oss-120b", name: "gpt-oss-120b" },
  ],
};
