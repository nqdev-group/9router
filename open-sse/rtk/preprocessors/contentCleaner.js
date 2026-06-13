// Content cleaning: whitespace normalization, BOM removal, blank line collapse
// Applied BEFORE format translation and RTK compression

const RE_BOM = /^\uFEFF+/;
const RE_MULTI_BLANK = /\n{3,}/g;
const RE_TRAILING_WS = /[ \t]+$/gm;
const RE_LEADING_WS = /^[ \t]+\n/gm;

export function cleanText(text) {
  if (!text || text.length < 10) return text;
  let cleaned = text;
  cleaned = cleaned.replace(RE_BOM, "");
  cleaned = cleaned.replace(RE_TRAILING_WS, "");
  cleaned = cleaned.replace(RE_LEADING_WS, "\n");
  cleaned = cleaned.replace(RE_MULTI_BLANK, "\n\n");
  return cleaned;
}

export function preprocessBody(body) {
  if (!body) return body;

  if (body.conversationState) {
    return preprocessKiro(body);
  }

  const items = Array.isArray(body.messages) ? body.messages
    : Array.isArray(body.input) ? body.input
    : null;
  if (!items) return body;

  for (const msg of items) {
    if (!msg) continue;

    if (typeof msg.content === "string") {
      msg.content = cleanText(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part && part.type === "text" && typeof part.text === "string") {
          part.text = cleanText(part.text);
        }
      }
    }
  }

  return body;
}

function preprocessKiro(body) {
  const state = body.conversationState;
  const allMessages = [...(Array.isArray(state?.history) ? state.history : [])];
  if (state?.currentMessage) allMessages.push(state.currentMessage);

  for (const msg of allMessages) {
    const toolResults = msg?.userInputMessage?.userInputMessageContext?.toolResults;
    if (!Array.isArray(toolResults)) continue;
    for (const tr of toolResults) {
      if (!Array.isArray(tr.content)) continue;
      for (const part of tr.content) {
        if (part && typeof part.text === "string") {
          part.text = cleanText(part.text);
        }
      }
    }
  }

  return body;
}
