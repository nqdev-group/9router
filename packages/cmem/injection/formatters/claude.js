export function injectClaude(body, contextText) {
  if (!body || !contextText) return body;
  const msgs = body.messages || body.contents;
  if (!Array.isArray(msgs) || msgs.length === 0) return body;

  const systemBlock = {
    type: "text",
    text: `[CMEM Memory Context]\n${contextText}\n[/CMEM Memory Context]`,
  };

  let systemContent = body.system;
  if (!systemContent) {
    systemContent = { type: "text", text: "" };
  }
  if (typeof systemContent === "string") {
    body.system = systemContent + "\n\n" + systemBlock.text;
  } else if (Array.isArray(systemContent)) {
    body.system = [...systemContent, systemBlock];
  } else if (typeof systemContent === "object") {
    body.system = [systemContent, systemBlock];
  }

  return body;
}
