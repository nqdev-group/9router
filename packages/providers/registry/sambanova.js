/* eslint-disable import/no-anonymous-default-export */
export default {
  id: "sambanova",
  priority: 180,
  hasFree: true,
  alias: "sambanova",
  uiAlias: "samba",
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
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.sambanova.ai/v1/chat/completions",
    validateUrl: "https://api.sambanova.ai/v1/models",
  },
  models: [
    { id: "MiniMax-M2.7", name: "MiniMax M2.7" },
    { id: "DeepSeek-V3.2", name: "DeepSeek V3.2" },
    { id: "Meta-Llama-3.3-70B-Instruct", name: "Llama 3.3 70B" },
    { id: "gpt-oss-120b", name: "GPT-OSS 120B" },
  ],
};
