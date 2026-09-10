// Heuristic task classification for tier-routing decisions. Deterministic and
// cheap (no extra model call) — good enough to gate "can this go to a free/cheap
// tier" without the latency/cost of a real classifier model.

const CODE_FENCE_RE = /```/;
const CODE_KEYWORDS_RE = /\b(function|class|const|let|var|import|export|def |return |=>|SELECT |INSERT |UPDATE |DELETE )\b/i;

function extractLastUserText(body) {
  const arr = Array.isArray(body?.messages) ? body.messages
    : Array.isArray(body?.input) ? body.input
    : Array.isArray(body?.contents) ? body.contents
    : null;
  if (!arr || arr.length === 0) return "";

  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i];
    if (m?.role !== "user") continue;
    const content = m.content ?? m.parts;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content.map((b) => b?.text || "").filter(Boolean).join("\n");
    }
  }
  return "";
}

/**
 * Classify a chat request for tier-routing purposes.
 * @param {object} body - Request body (any supported client format)
 * @returns {{ hasTools: boolean, isCode: boolean, critical: boolean, complexity: "low"|"medium"|"high", textLength: number }}
 */
export function classifyTask(body) {
  const hasTools = Array.isArray(body?.tools) && body.tools.length > 0;
  const text = extractLastUserText(body);
  const isCode = CODE_FENCE_RE.test(text) || CODE_KEYWORDS_RE.test(text);

  // "critical" = agentic/code work — needs a capable model, not a cost cut.
  const critical = hasTools || isCode;

  let complexity = "low";
  if (text.length > 4000) complexity = "high";
  else if (text.length > 800) complexity = "medium";

  return { hasTools, isCode, critical, complexity, textLength: text.length };
}
