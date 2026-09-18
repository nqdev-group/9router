import { z } from "zod";
import { handleStt } from "@/sse/handlers/stt.js";
import { buildProxyFormRequest, responseToToolResult } from "./shared/proxyRequest.js";

export const speechToTextTool = {
  name: "speech_to_text",
  title: "Speech to text",
  description:
    "Transcribe audio via 9Router (OpenAI Whisper-compatible /v1/audio/transcriptions). Audio must be provided as base64 — MCP tool calls carry no binary file attachments. Use list_models (kind: \"stt\") to find a valid model id first.",
  inputSchema: {
    model: z.string().describe('STT model id, e.g. "openai/whisper-1". See list_models with kind:"stt".'),
    audio_base64: z.string().min(1).describe("Base64-encoded audio file bytes."),
    filename: z.string().optional().describe('Filename hint for the upload, e.g. "audio.mp3". Defaults to "audio.mp3".'),
    mime_type: z.string().optional().describe('MIME type of the audio, e.g. "audio/mpeg". Defaults to "audio/mpeg".'),
  },
  async handler({ model, audio_base64, filename, mime_type }, { authInfo }) {
    const buffer = Buffer.from(audio_base64, "base64");
    const blob = new Blob([buffer], { type: mime_type || "audio/mpeg" });
    const formData = new FormData();
    formData.set("model", model);
    formData.set("file", blob, filename || "audio.mp3");
    const request = buildProxyFormRequest({ path: "/v1/audio/transcriptions", formData, authInfo });
    const response = await handleStt(request);
    return responseToToolResult(response);
  },
};
