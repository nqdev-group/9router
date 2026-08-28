import { z } from "zod";
import { handleImageGeneration } from "@/sse/handlers/imageGeneration.js";
import { buildProxyRequest } from "./shared/proxyRequest.js";

export const generateImageTool = {
  name: "generate_image",
  title: "Generate image",
  description:
    "Generate an image via 9Router (OpenAI-compatible /v1/images/generations). Always requests base64 output so the image comes back as inline MCP image content — use list_models (kind: \"image\") to find a valid model id first.",
  inputSchema: {
    model: z.string().describe('Image model id, e.g. "openai/gpt-image-1". See list_models with kind:"image".'),
    prompt: z.string().min(1).describe("Text description of the desired image."),
    size: z.string().optional().describe('e.g. "1024x1024" — only if the model supports it.'),
    n: z.number().int().positive().max(4).optional().describe("Number of images to generate (provider-dependent cap)."),
    extra: z.record(z.string(), z.any()).optional().describe("Any other OpenAI-compatible images.generations fields."),
  },
  async handler({ model, prompt, size, n, extra }, { authInfo }) {
    const body = {
      ...(extra || {}),
      model,
      prompt,
      response_format: "b64_json",
      ...(size !== undefined ? { size } : {}),
      ...(n !== undefined ? { n } : {}),
    };
    const request = buildProxyRequest({ path: "/v1/images/generations", body, authInfo });
    const response = await handleImageGeneration(request);
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

    const images = Array.isArray(parsed?.data) ? parsed.data.filter((d) => d?.b64_json) : [];
    if (images.length === 0) {
      // Provider returned URLs (or something else non-b64) — surface raw JSON instead of failing.
      return { content: [{ type: "text", text }] };
    }
    return {
      content: images.map((d) => ({ type: "image", data: d.b64_json, mimeType: "image/png" })),
    };
  },
};
