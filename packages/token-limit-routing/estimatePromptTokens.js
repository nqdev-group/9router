// Pure prompt-token estimator. Same char/4 heuristic as packages/cmem/utils/tokens.js
// (kept independent rather than imported — cmem is a heavier stateful subsystem with
// its own DB tables; this package stays a small pure function with no cross-feature
// dependency, matching the packages/tier-routing convention).
const TOKEN_RATIO = 4;

function estimateTextTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / TOKEN_RATIO);
}

// openai/claude content blocks and gemini `parts` both carry text under `.text`.
function extractBlockText(block) {
  if (!block || typeof block !== "object") return "";
  return typeof block.text === "string" ? block.text : "";
}

function contentTokens(content) {
  if (typeof content === "string") return estimateTextTokens(content);
  if (Array.isArray(content)) {
    let total = 0;
    for (const block of content) {
      total += typeof block === "string" ? estimateTextTokens(block) : estimateTextTokens(extractBlockText(block));
    }
    return total;
  }
  return 0;
}

// +4 tokens/message: rough allowance for role/formatting overhead (same convention
// used by packages/cmem/utils/tokens.js's estimateTokensFromMessages).
function messagesTokens(messages) {
  if (!Array.isArray(messages)) return 0;
  let total = 0;
  for (const msg of messages) {
    if (!msg) continue;
    total += contentTokens(msg.content) + (msg.role ? 4 : 0);
  }
  return total;
}

function geminiContentsTokens(contents) {
  if (!Array.isArray(contents)) return 0;
  let total = 0;
  for (const c of contents) {
    if (!c) continue;
    if (Array.isArray(c.parts)) {
      for (const part of c.parts) total += estimateTextTokens(part?.text);
    }
    total += 4;
  }
  return total;
}

/**
 * Estimate total prompt tokens for a request body, across the 3 shapes combo.js
 * already knows how to read (openai/claude `messages`, responses-api `input`,
 * gemini/antigravity `contents`/`request.contents`), plus a top-level `system`
 * field (Claude-style). Whole-conversation total (not just the trailing turn) —
 * this is what actually gets sent to the model, unlike capability detection which
 * only cares about the current turn's modality.
 * @param {object} body
 * @returns {number}
 */
export function estimatePromptTokens(body) {
  if (!body || typeof body !== "object") return 0;

  let total = 0;
  if (typeof body.system === "string") total += estimateTextTokens(body.system);
  else if (Array.isArray(body.system)) total += contentTokens(body.system);

  if (Array.isArray(body.messages)) total += messagesTokens(body.messages);
  if (Array.isArray(body.input)) total += messagesTokens(body.input);

  const contents = body.contents || body.request?.contents;
  if (Array.isArray(contents)) total += geminiContentsTokens(contents);

  return total;
}
