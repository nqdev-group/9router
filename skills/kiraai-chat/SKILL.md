---
name: kiraai-chat
description: Chat / code generation via Kira AI API using OpenAI-compatible /v1/chat/completions with streaming. Use when the user wants to ask an LLM, generate code, summarize text, or run prompts through Kira AI.
---

# Kira AI — Chat Completions

Requires `KIRA_API_KEY` from https://kiraai.vn console → Quản lý API Key.

## Endpoint

`POST https://kiraai.vn/api/v1/chat/completions` — OpenAI format

## Models

| Model | Description |
|---|---|
| `kira-3.5-flash` | Default, fastest, versatile |
| `kira-3-flash-preview` | Preview flash model |
| `kira-2.5-flash` | Previous-gen flash |
| `kira-2.5-pro` | Deep reasoning, complex code & analysis |

## Examples

cURL:

```bash
curl -X POST https://kiraai.vn/api/v1/chat/completions \
  -H "Authorization: Bearer $KIRA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"kira-3.5-flash","messages":[{"role":"user","content":"Hi"}],"stream":false}'
```

Node.js (OpenAI SDK):

```js
import OpenAI from "openai";
const client = new OpenAI({ baseURL: "https://kiraai.vn/api/v1", apiKey: process.env.KIRA_API_KEY });
const res = await client.chat.completions.create({
  model: "kira-3.5-flash",
  messages: [{ role: "user", content: "Write a Python function to merge two dicts" }],
  stream: true,
});
for await (const chunk of res) process.stdout.write(chunk.choices[0]?.delta?.content || "");
```

## Response shape

```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "model": "kira-3.5-flash",
  "choices": [
    { "index": 0, "message": { "role": "assistant", "content": "Hello!" }, "finish_reason": "stop" }
  ],
  "usage": { "prompt_tokens": 8, "completion_tokens": 2, "total_tokens": 10 }
}
```

Streaming (`stream:true`) emits SSE: `data: {choices:[{delta:{content:"..."}}]}\n\n` ... `data: [DONE]\n\n`.
