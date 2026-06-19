---
name: kiraai-tts
description: Text-to-speech via Kira AI API /v1/audio/speech using OpenAI-compatible format. Use when the user wants to convert text to speech, generate audio, voiceover, narrate, or read text aloud through Kira AI.
---

# Kira AI — Text-to-Speech

Requires `KIRA_API_KEY` from https://kiraai.vn console → Quản lý API Key.

## Endpoint

`POST https://kiraai.vn/api/v1/audio/speech` — OpenAI-compatible

| Field | Required | Notes |
|---|---|---|
| `model` | yes | e.g. `kira-2.5-flash` |
| `input` | yes | text to speak |
| `voice` | yes | see voices below |

## Voices

| Kira voice | OpenAI alias |
|---|---|
| `Kore` | `alloy` |
| `Fenrir` | `echo` |
| `Puck` | `fable` |
| `Charon` | `onyx` |
| `Aoede` | `nova` |

Use OpenAI voice names (`alloy`, `echo`, `fable`, `onyx`, `nova`) — Kira auto-maps them.

## Examples

cURL (save MP3):

```bash
curl -X POST https://kiraai.vn/api/v1/audio/speech \
  -H "Authorization: Bearer $KIRA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"kira-2.5-flash","input":"Chào mừng bạn đến với Kira AI.","voice":"alloy"}' \
  --output speech.mp3
```

Node.js (OpenAI SDK):

```js
import { writeFile } from "node:fs/promises";
import OpenAI from "openai";
const client = new OpenAI({ baseURL: "https://kiraai.vn/api/v1", apiKey: process.env.KIRA_API_KEY });
const mp3 = await client.audio.speech.create({
  model: "kira-2.5-flash",
  voice: "alloy",
  input: "Chào mừng bạn đến với hệ sinh thái trí tuệ nhân tạo Kira AI.",
});
const buffer = Buffer.from(await mp3.arrayBuffer());
await writeFile("speech.mp3", buffer);
```

## Response shape

Raw audio bytes (Content-Type `audio/mpeg` or `audio/mp3`).
