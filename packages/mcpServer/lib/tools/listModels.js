import { z } from "zod";
import { buildModelsList } from "@/app/api/v1/models/route.js";

const KIND_VALUES = [
  "llm", "image", "tts", "stt", "embedding", "imageToText", "video", "webSearch", "webFetch",
];

export const listModelsTool = {
  name: "list_models",
  title: "List available models",
  description:
    "List models/combos currently available on this 9Router instance, optionally filtered by capability kind (chat, image, tts, stt, embedding, video, web search/fetch). Use this before chat_completion to confirm a model id exists.",
  inputSchema: {
    kind: z
      .enum(KIND_VALUES)
      .optional()
      .describe('Capability filter. Defaults to "llm" (chat/completions models).'),
  },
  async handler({ kind }) {
    const models = await buildModelsList([kind || "llm"]);
    return {
      content: [{ type: "text", text: JSON.stringify({ object: "list", data: models }, null, 2) }],
    };
  },
};
