const TOKEN_RATIO = 4;

export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / TOKEN_RATIO);
}

export function estimateTokensFromMessages(messages) {
  if (!Array.isArray(messages)) return 0;
  let total = 0;
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      total += estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part?.type === "text" && part.text) total += estimateTokens(part.text);
      }
    }
    if (msg.role) total += 4;
  }
  return total;
}
