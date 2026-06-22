export function injectGemini(body, contextText) {
  if (!body || !contextText) return body;
  const msgs = body.contents || body.messages;
  if (!Array.isArray(msgs) || msgs.length === 0) return body;

  const contextPart = {
    text: `[CMEM Memory Context]\n${contextText}\n[/CMEM Memory Context]`,
  };

  const systemInstruction = body.system_instruction || body.systemInstruction;
  if (systemInstruction) {
    const parts = systemInstruction.parts || systemInstruction;
    if (Array.isArray(parts)) {
      parts.push(contextPart);
    }
  } else {
    body.system_instruction = { parts: [contextPart] };
  }

  return body;
}
