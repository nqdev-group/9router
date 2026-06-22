export function injectOpenAI(body, contextText) {
  if (!body || !contextText) return body;
  const msgs = body.messages || body.input;
  if (!Array.isArray(msgs) || msgs.length === 0) return body;

  const systemMsg = {
    role: "system",
    content: `[CMEM Memory Context]\n${contextText}\n[/CMEM Memory Context]`,
  };

  const lastSystemIdx = msgs.length - 1;
  let inserted = false;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]?.role === "system" || msgs[i]?.role === "developer") {
      msgs.splice(i + 1, 0, systemMsg);
      inserted = true;
      break;
    }
  }
  if (!inserted) msgs.unshift(systemMsg);

  if (body.messages) body.messages = msgs;
  else if (body.input) body.input = msgs;
  return body;
}
