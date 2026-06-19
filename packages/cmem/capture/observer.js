import { hashContent } from "../utils/hash.js";
import { estimateTokens } from "../utils/tokens.js";
import { OBSERVATION_TYPES } from "./types.js";

const PRIVATE_TAG_RE = /<private>[\s\S]*?<\/private>/g;

export class Observer {
  constructor({ excludePrivateContent = true } = {}) {
    this.excludePrivateContent = excludePrivateContent;
  }

  stripPrivateTags(content) {
    if (!this.excludePrivateContent || !content) return content;
    return content.replace(PRIVATE_TAG_RE, "");
  }

  observe({ model, messages, response, provider } = {}) {
    if (!messages && !response) return null;

    const observation = {
      id: null,
      sessionId: null,
      type: OBSERVATION_TYPES.NOTE,
      title: "",
      content: "",
      summary: null,
      facts: [],
      concepts: [],
      filesRead: [],
      filesModified: [],
      tokens: 0,
      provider: provider || "unknown",
      createdAt: Date.now(),
    };

    const textParts = [];
    const userMessages = (messages || []).filter(m => m?.role === "user");
    const lastUserMsg = userMessages[userMessages.length - 1];
    if (lastUserMsg) {
      const text = extractText(lastUserMsg.content);
      const clean = this.stripPrivateTags(text);
      textParts.push(clean);
      observation.title = clean.split("\n")[0]?.slice(0, 120) || "";
      observation.type = classifyObservation(clean);
    }

    const toolResults = (messages || []).filter(m => m?.role === "tool");
    for (const tr of toolResults) {
      const text = extractText(tr.content);
      textParts.push(this.stripPrivateTags(text));
    }

    if (response) {
      const respText = typeof response === "string" ? response : response.content || "";
      textParts.push(`[response] ${this.stripPrivateTags(respText).slice(0, 2000)}`);
    }

    observation.content = textParts.join("\n---\n");
    observation.tokens = estimateTokens(observation.content);
    observation.id = hashContent(observation.content);

    return observation;
  }
}

function extractText(content) {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter(p => p?.type === "text" && p.text)
      .map(p => p.text)
      .join("\n");
  }
  return "";
}

function classifyObservation(text) {
  const lower = text.toLowerCase();
  if (/\b(fix|bug|issue|error|crash)\b/.test(lower)) return OBSERVATION_TYPES.BUGFIX;
  if (/\b(implement|add|create|feature)\b/.test(lower)) return OBSERVATION_TYPES.IMPLEMENTATION;
  if (/\b(decide|choice|choose|prefer)\b/.test(lower)) return OBSERVATION_TYPES.DECISION;
  if (/\b(explore|search|find|lookup)\b/.test(lower)) return OBSERVATION_TYPES.EXPLORATION;
  if (/\breview\b/.test(lower)) return OBSERVATION_TYPES.REVIEW;
  if (/\b(change|update|modify|refactor)\b/.test(lower)) return OBSERVATION_TYPES.CHANGE;
  if (/\?/.test(lower) || /\b(how|what|why)\b/.test(lower)) return OBSERVATION_TYPES.QUESTION;
  if (/\b(error|fail|warn)\b/.test(lower)) return OBSERVATION_TYPES.ERROR;
  return OBSERVATION_TYPES.NOTE;
}
