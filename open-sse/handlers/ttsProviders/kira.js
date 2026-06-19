import { Buffer } from "node:buffer";

const KIRA_TTS_URL = "https://kiraai.vn/api/v1/audio/speech";

const VOICE_MAP = { alloy: "Kore", echo: "Fenrir", fable: "Puck", onyx: "Charon", nova: "Aoede" };

export default {
  async synthesize(text, model, credentials) {
    if (!credentials?.apiKey) throw new Error("No Kira AI API key configured");

    let ttsModel = "kira-2.5-flash";
    let voice = "Kore";
    if (model && model.includes("/")) {
      const parts = model.split("/");
      if (parts.length === 2) [ttsModel, voice] = parts;
    } else if (model) {
      voice = VOICE_MAP[model] || model;
    }

    const res = await fetch(KIRA_TTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${credentials.apiKey}` },
      body: JSON.stringify({ model: ttsModel, voice, input: text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Kira TTS failed: ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    return { base64: Buffer.from(buf).toString("base64"), format: "mp3" };
  },
};
