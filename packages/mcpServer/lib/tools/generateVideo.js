import { z } from "zod";
import { handleVideoCreate } from "@/sse/handlers/videoGeneration.js";
import { buildProxyRequest, responseToToolResult } from "./shared/proxyRequest.js";

// Video generation is async job creation only (xAI Grok Imagine today) — this
// tool submits the job and returns its id/status, it does NOT wait for or
// return the finished video. There is no companion "check status" MCP tool
// yet (the REST GET /v1/videos/{id} poll endpoint isn't exposed here) — see
// plans/2026-08-27-mcp-server-tools-planning.md §4 Risks for why that's a
// known gap, not an oversight.
export const generateVideoTool = {
  name: "generate_video",
  title: "Generate video (async job)",
  description:
    "Submit an async video generation job via 9Router (xAI Grok Imagine today). Returns job metadata (including a request id), NOT the finished video — there is currently no MCP tool to poll job status, so treat this as fire-and-forget unless you have another way to check GET /v1/videos/{id}.",
  inputSchema: {
    model: z.string().optional().describe('Video model id, e.g. "xai/grok-imagine-video". Omit to use the default video provider.'),
    prompt: z.string().min(1).describe("Text description of the desired video."),
    extra: z.record(z.string(), z.any()).optional().describe("Any other provider-specific fields (image, duration, ...)."),
  },
  async handler({ model, prompt, extra }, { authInfo }) {
    const body = { ...(extra || {}), prompt, ...(model !== undefined ? { model } : {}) };
    const request = buildProxyRequest({ path: "/v1/videos/generations", body, authInfo });
    const response = await handleVideoCreate(request, "generations");
    return responseToToolResult(response);
  },
};
