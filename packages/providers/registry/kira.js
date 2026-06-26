export default {
  id: "kira",
  priority: 150,
  alias: "kira",
  display: {
    name: "Kira AI",
    icon: "smart_toy",
    color: "#8B5CF6",
    textIcon: "KI",
    website: "https://kiraai.vn",
    notice: {
      apiKeyUrl: "https://kiraai.vn/api-keys",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://kiraai.vn/api/v1/chat/completions",
    validateUrl: "https://kiraai.vn/api/v1/models",
  },
  models: [
    { id: "kira-3.5-flash", name: "Kira 3.5 Flash" },
    { id: "kira-2.5-pro", name: "Kira 2.5 Pro" },
    { id: "kira-2.5-flash", name: "Kira 2.5 Flash" },
    { id: "kira-3-pro-image-preview", name: "Kira 3 Pro Image", type: "image", params: ["n", "size"] },
    { id: "kira-3.1-flash-image-preview", name: "Kira 3.1 Flash Image", type: "image", params: ["n", "size"] },
    { id: "kira-3.1-generate-001", name: "Kira 3.1 Generate", type: "video", params: [] },
  ],
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
