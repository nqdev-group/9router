import { API_BASE, STATUS_BASE, POLL_INTERVAL_MS, MAX_POLL_ATTEMPTS, STATUS_COMPLETED, STATUS_FAILED } from "./config.js";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

export async function synthesize(text, model, credentials) {
  if (!credentials?.apiKey) throw new Error("RevidAPI API key required");

  let engine = "edge";
  let voiceId = undefined;
  let voice = undefined;

  if (model) {
    const parts = model.split("/");
    if (parts.length >= 2) {
      engine = parts[0];
      const voicePart = parts.slice(1).join("/");
      if (/^\d+$/.test(voicePart)) {
        voiceId = parseInt(voicePart, 10);
      } else {
        voice = voicePart;
      }
    } else {
      if (/^\d+$/.test(model)) {
        voiceId = parseInt(model, 10);
      } else {
        voice = model;
      }
    }
  }

  const body = { text, engine, speed: 1.0, pitch: 0 };
  if (voiceId !== undefined) body.voice_id = voiceId;
  if (voice) body.voice = voice;

  const createRes = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": credentials.apiKey,
      "User-Agent": UA,
    },
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err?.message || `RevidAPI TTS failed: ${createRes.status}`);
  }

  const createData = await createRes.json();

  if (createData.code === 200 && createData.response?.audio_url) {
    return fetchAudioAsBase64(createData.response.audio_url);
  }

  const taskId = createData.task_id;
  if (!taskId) throw new Error("RevidAPI: no task_id returned");

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS);

    const statusRes = await fetch(`${STATUS_BASE}/${taskId}`, {
      headers: { "x-api-key": credentials.apiKey, "User-Agent": UA },
    });

    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();

    if (statusData.status === STATUS_COMPLETED && statusData.response?.audio_url) {
      return fetchAudioAsBase64(statusData.response.audio_url);
    }

    if (statusData.status === STATUS_FAILED) {
      throw new Error(`RevidAPI TTS failed: ${statusData.message || "unknown"}`);
    }
  }

  throw new Error("RevidAPI TTS timeout: task did not complete in 150s");
}

export default { synthesize };

async function fetchAudioAsBase64(audioUrl) {
  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error(`Failed to fetch audio: ${res.status}`);

  const contentType = res.headers.get("content-type") || "";
  let format = "mp3";
  if (contentType.includes("wav")) format = "wav";
  else if (contentType.includes("ogg")) format = "ogg";

  const { Buffer } = await import("node:buffer");
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 100) throw new Error("RevidAPI returned empty audio");

  return { base64: Buffer.from(buf).toString("base64"), format };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
