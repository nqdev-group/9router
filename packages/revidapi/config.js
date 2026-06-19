export const REVIDAPI_REGISTRY_ENTRY = {
  id: "revidapi",
  alias: "rv",
  display: {
    name: "RevidAPI",
    icon: "record_voice_over",
    color: "#15803d",
    textIcon: "RV",
    website: "https://revidapi.com",
    notice: { apiKeyUrl: "https://revidapi.com" },
  },
  category: "apikey",
  authType: "apikey",
  serviceKinds: ["tts"],
  ttsConfig: {
    baseUrl: "https://api.revidapi.com/paid/text-to-speech",
    authType: "apikey",
    authHeader: "x-api-key",
    format: "revidapi",
    engines: ["edge", "capcut", "google"],
    defaultEngine: "edge",
    defaultModel: "edge/vi-VN-HoaiMyNeural",
    models: [
      { id: "edge", name: "Edge TTS (Free Engine)" },
      { id: "capcut", name: "CapCut TTS" },
      { id: "google", name: "Google TTS" },
    ],
  },
};

export const REVIDAPI_MODELS_CONFIG = {
  models: [
    { id: "edge", name: "Edge TTS (Free)", type: "tts" },
    { id: "capcut", name: "CapCut TTS", type: "tts" },
    { id: "google", name: "Google TTS", type: "tts" },
  ],
  voices: {
    edge: [
      { id: "vi-VN-HoaiMyNeural", name: "Vietnamese Female", type: "tts" },
      { id: "vi-VN-NamMinhNeural", name: "Vietnamese Male", type: "tts" },
      { id: "en-US-JennyNeural", name: "English Female", type: "tts" },
      { id: "en-US-GuyNeural", name: "English Male", type: "tts" },
      { id: "ja-JP-NanamiNeural", name: "Japanese Female", type: "tts" },
      { id: "ko-KR-SunHiNeural", name: "Korean Female", type: "tts" },
      { id: "zh-CN-XiaoxiaoNeural", name: "Chinese Female", type: "tts" },
    ],
  },
  allVoices: [
    { id: "vi-VN-HoaiMyNeural", name: "Vietnamese Female", type: "tts" },
    { id: "vi-VN-NamMinhNeural", name: "Vietnamese Male", type: "tts" },
    { id: "en-US-JennyNeural", name: "English Female", type: "tts" },
    { id: "en-US-GuyNeural", name: "English Male", type: "tts" },
    { id: "ja-JP-NanamiNeural", name: "Japanese Female", type: "tts" },
    { id: "ko-KR-SunHiNeural", name: "Korean Female", type: "tts" },
    { id: "zh-CN-XiaoxiaoNeural", name: "Chinese Female", type: "tts" },
  ],
};

export const REVIDAPI_VOICES = [
  { id: "vi-VN-HoaiMyNeural", name: "Hoai My", lang: "vi", gender: "female", engine: "edge" },
  { id: "vi-VN-NamMinhNeural", name: "Nam Minh", lang: "vi", gender: "male", engine: "edge" },
  { id: "en-US-JennyNeural", name: "Jenny", lang: "en", gender: "female", engine: "edge" },
  { id: "en-US-GuyNeural", name: "Guy", lang: "en", gender: "male", engine: "edge" },
  { id: "ja-JP-NanamiNeural", name: "Nanami", lang: "ja", gender: "female", engine: "edge" },
  { id: "ko-KR-SunHiNeural", name: "Sun Hi", lang: "ko", gender: "female", engine: "edge" },
  { id: "zh-CN-XiaoxiaoNeural", name: "Xiaoxiao", lang: "zh", gender: "female", engine: "edge" },
];

export const API_BASE = "https://api.revidapi.com/paid/text-to-speech";
export const STATUS_BASE = "https://tts.revidapi.com/api/get";
export const POLL_INTERVAL_MS = 5000;
export const MAX_POLL_ATTEMPTS = 30;
export const STATUS_COMPLETED = "completed";
export const STATUS_FAILED = "failed";
