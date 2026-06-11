// Smart context pruning: dedup duplicate content in conversation history
// Applied BEFORE format translation and RTK compression

const RE_CODE_BLOCK = /```[\s\S]*?```/g;
const RE_FILE_PATH = /(?:^|\s)([\w./\\-]+\.\w{1,10})(?::\d+(?::\d+)?)?(?=\s|$)/gm;
const RE_ERROR_MSG = /(Error|Exception|Traceback|FAILED|Failed):[^\n]+/g;

export function pruneBody(body) {
  if (!body) return body;

  const items = Array.isArray(body.messages) ? body.messages
    : Array.isArray(body.input) ? body.input
    : null;
  if (!items || items.length < 2) return body;

  const seenBlocks = new Map();
  const processed = new WeakSet();

  for (const msg of items) {
    if (!msg) continue;
    const texts = collectTexts(msg);
    for (let ti = 0; ti < texts.length; ti++) {
      const t = texts[ti];
      if (!t || processed.has(t)) continue;
      processed.add(t);

      // Find duplicate code blocks
      const blocks = t.text.match(RE_CODE_BLOCK);
      if (blocks) {
        for (const block of blocks) {
          const key = block.substring(0, 80) + ":" + block.length;
          if (seenBlocks.has(key)) {
            t.text = t.text.replace(block, `[duplicate ${detectLang(block)} block omitted (same as previous turn)]`);
          } else {
            seenBlocks.set(key, true);
          }
        }
      }
    }
  }

  return body;
}

function collectTexts(msg) {
  const result = [];
  if (typeof msg.content === "string") {
    result.push({ text: msg.content, ref: msg, key: "content" });
  } else if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (part && part.type === "text" && typeof part.text === "string") {
        result.push({ text: part.text, ref: part, key: "text" });
      }
    }
  }
  return result;
}

function detectLang(block) {
  const m = block.match(/^```(\w+)/);
  return m ? m[1] : "code";
}
