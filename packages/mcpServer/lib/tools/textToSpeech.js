import { z } from "zod";
import { handleTts } from "@/sse/handlers/tts.js";
import { buildProxyRequest } from "./shared/proxyRequest.js";

export const textToSpeechTool = {
  name: "text_to_speech",
  title: "Text to speech",
  description:
    "Synthesize speech via 9Router (OpenAI-compatible /v1/audio/speech). Returns inline MCP audio content. Use list_models (kind: \"tts\") to find a valid model/voice id first.",
  inputSchema: {
    model: z.string().describe('TTS model/voice id, e.g. "openai/alloy". See list_models with kind:"tts".'),
    input: z.string().min(1).describe("Text to synthesize."),
    language: z.string().optional().describe("Optional language hint (used by some providers, e.g. Gemini)."),
    style: z.string().optional().describe("Optional style/voice instruction (provider-dependent)."),
  },
  async handler({ model, input, language, style }, { authInfo }) {
    const body = { model, input, ...(language ? { language } : {}), ...(style ? { style } : {}) };
    // response_format=json → { audio: base64, format } instead of raw binary bytes,
    // so the result can be returned as an MCP audio content block.
    const request = buildProxyRequest({ path: "/v1/audio/speech?response_format=json", body, authInfo });
    const response = await handleTts(request);
    const text = await response.text();

    if (!response.ok) {
      return { isError: true, content: [{ type: "text", text: `HTTP ${response.status}: ${text}` }] };
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { content: [{ type: "text", text }] };
    }
    if (!parsed?.audio) return { content: [{ type: "text", text }] };

    return {
      content: [{ type: "audio", data: parsed.audio, mimeType: `audio/${parsed.format || "mp3"}` }],
    };
  },
};
