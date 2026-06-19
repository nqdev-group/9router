---
name: kiraai-image
description: Generate images via Kira AI API /v1/images/generations using kira-3-pro-image-preview or kira-3.1-flash-image-preview models. Use when the user wants to create, generate, draw, or render an image through Kira AI.
---

# Kira AI — Image Generation

Requires `KIRA_API_KEY` from https://kiraai.vn console → Quản lý API Key.

## Endpoint

`POST https://kiraai.vn/api/v1/images/generations`

| Field | Required | Notes |
|---|---|---|
| `model` | yes | `kira-3-pro-image-preview` (quality) or `kira-3.1-flash-image-preview` (speed) |
| `prompt` | yes | image description |
| `aspect_ratio` | no | `1:1`, `16:9`, `9:16`, `4:3`, `3:4` |

## Examples

cURL:

```bash
curl -X POST https://kiraai.vn/api/v1/images/generations \
  -H "Authorization: Bearer $KIRA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"kira-3-pro-image-preview","prompt":"A beautiful cyber-punk city in rain, neon light reflections, high resolution","aspect_ratio":"16:9"}' \
  --output out.png
```

Node.js (OpenAI SDK):

```js
import OpenAI from "openai";
const client = new OpenAI({ baseURL: "https://kiraai.vn/api/v1", apiKey: process.env.KIRA_API_KEY });
const res = await client.images.generate({
  model: "kira-3-pro-image-preview",
  prompt: "watercolor mountains at sunrise",
  n: 1,
});
console.log(res.data[0].url);
```

## Response shape

```json
{
  "created": 1735000000,
  "data": [{ "url": "https://..." }]
}
```
