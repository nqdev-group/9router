// RTK port: compress tool_result content in LLM request bodies
// Injected at the top of translateRequest (before any format translation)
import { RAW_CAP, MIN_COMPRESS_SIZE } from "./constants.js";
import { autoDetectFilter } from "./autodetect.js";
import { safeApply } from "./applyFilter.js";
import { resolveRtkConfig } from "./configResolver.js";
import { batchCompressTexts } from "./batchCompress.js";

// Compress tool_result content in-place. Returns stats or null if disabled/failed.
export function compressMessages(body, enabled, rtkConfig) {
  if (!enabled) return null;
  if (!body) return null;

  // Convert rtkConfig to resolved config object (null for legacy behavior)
  const config = rtkConfig === undefined || rtkConfig === null ? null : resolveRtkConfig(rtkConfig);

  // Kiro format: conversationState.history + conversationState.currentMessage
  if (body.conversationState) {
    return compressKiroFormat(body, config);
  }

  // Support both OpenAI/Claude "messages" and OpenAI Responses "input"
  const items = Array.isArray(body.messages) ? body.messages
    : Array.isArray(body.input) ? body.input
    : null;
  if (!items) return null;

  // Batch pass: collect small system/user text segments, compress as single blob
  const batchable = [];
  const batchRefs = [];
  for (const msg of items) {
    if (!msg) continue;
    if (msg.role !== "system" && msg.role !== "developer" && msg.role !== "user") continue;
    const texts = typeof msg.content === "string" ? [msg.content]
      : Array.isArray(msg.content) ? msg.content.filter(p => p && p.type === "text" && typeof p.text === "string").map(p => p.text)
      : [];
    for (const t of texts) {
      if (t.length < 500) {
        batchable.push(t);
        batchRefs.push({ msg, text: t });
      }
    }
  }
  if (batchable.length >= 3) {
    const batchResult = batchCompressTexts(batchable, config);
    if (batchResult && batchResult.length === batchRefs.length) {
      for (let bi = 0; bi < batchRefs.length; bi++) {
        const ref = batchRefs[bi];
        const origLen = ref.text.length;
        const newLen = batchResult[bi].length;
        if (newLen > 0 && newLen < origLen) {
          const msg = ref.msg;
          if (typeof msg.content === "string") {
            msg.content = batchResult[bi];
          } else if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if (part && part.type === "text" && part.text === ref.text) {
                part.text = batchResult[bi];
                break;
              }
            }
          }
        }
      }
    }
  }

  const stats = { bytesBefore: 0, bytesAfter: 0, hits: [] };
  try {
    for (let i = 0; i < items.length; i++) {
      const msg = items[i];
      if (!msg) continue;

      // System/developer messages: compress long prompt text
      if (msg.role === "system" || msg.role === "developer") {
        if (typeof msg.content === "string") {
          msg.content = compressText(msg.content, stats, "system", config);
        } else if (Array.isArray(msg.content)) {
          for (let k = 0; k < msg.content.length; k++) {
            const part = msg.content[k];
            if (part && part.type === "text" && typeof part.text === "string") {
              part.text = compressText(part.text, stats, "system-array", config);
            }
          }
        }
        continue;
      }

      // User messages: compress code blocks, long text
      if (msg.role === "user") {
        if (typeof msg.content === "string") {
          msg.content = compressText(msg.content, stats, "user", config);
        } else if (Array.isArray(msg.content)) {
          for (let k = 0; k < msg.content.length; k++) {
            const part = msg.content[k];
            if (part && part.type === "text" && typeof part.text === "string") {
              part.text = compressText(part.text, stats, "user-array", config);
            }
          }
        }
        continue;
      }

      // Shape 4: OpenAI Responses — top-level { type:"function_call_output", output: string | [{type:"input_text", text}] }
      if (msg.type === "function_call_output") {
        if (typeof msg.output === "string") {
          msg.output = compressText(msg.output, stats, "openai-responses-string", config);
        } else if (Array.isArray(msg.output)) {
          for (let k = 0; k < msg.output.length; k++) {
            const part = msg.output[k];
            if (part && part.type === "input_text" && typeof part.text === "string") {
              part.text = compressText(part.text, stats, "openai-responses-array", config);
            }
          }
        }
        continue;
      }

      // Shape 1: OpenAI tool message — { role:"tool", content: "string" }
      if (msg.role === "tool" && typeof msg.content === "string") {
        msg.content = compressText(msg.content, stats, "openai-tool", config);
        continue;
      }

      if (!Array.isArray(msg.content)) continue;

      // Shape 1b: OpenAI tool message — { role:"tool", content:[{type:"text", text:"..."}] }
      if (msg.role === "tool") {
        for (let k = 0; k < msg.content.length; k++) {
          const part = msg.content[k];
          if (part && part.type === "text" && typeof part.text === "string") {
            part.text = compressText(part.text, stats, "openai-tool-array", config);
          }
        }
        continue;
      }

      // Shape 2/3: blocks array with tool_result entries
      for (let j = 0; j < msg.content.length; j++) {
        const block = msg.content[j];
        if (!block || block.type !== "tool_result") continue;
        if (block.is_error === true) continue; // preserve error traces

        if (typeof block.content === "string") {
          // Shape 2: claude string form
          block.content = compressText(block.content, stats, "claude-string", config);
        } else if (Array.isArray(block.content)) {
          // Shape 3: claude array form — compress each text part
          for (let k = 0; k < block.content.length; k++) {
            const part = block.content[k];
            if (part && part.type === "text" && typeof part.text === "string") {
              part.text = compressText(part.text, stats, "claude-array", config);
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("[RTK] compressMessages error:", e.message);
    return null;
  }
  return stats;
}

// Compress Kiro format: conversationState.history[].userInputMessage.userInputMessageContext.toolResults[].content[].text
function compressKiroFormat(body, config) {
  const stats = { bytesBefore: 0, bytesAfter: 0, hits: [] };
  try {
    const state = body.conversationState;
    const allMessages = [...(Array.isArray(state?.history) ? state.history : [])];
    if (state?.currentMessage) allMessages.push(state.currentMessage);

    for (const msg of allMessages) {
      const toolResults = msg?.userInputMessage?.userInputMessageContext?.toolResults;
      if (!Array.isArray(toolResults)) continue;

      for (const tr of toolResults) {
        if (tr.status === "error") continue; // preserve error traces
        if (!Array.isArray(tr.content)) continue;

        for (const part of tr.content) {
          if (part && typeof part.text === "string") {
            part.text = compressText(part.text, stats, "kiro-tool-result", config);
          }
        }
      }
    }
  } catch (e) {
    console.warn("[RTK] compressKiroFormat error:", e.message);
    return null;
  }
  return stats;
}

function compressText(text, stats, shape, config) {
  const bytesIn = text.length;
  stats.bytesBefore += bytesIn;

  // Determine min and max size from config or legacy
  const minSize = config ? config.minCompressSize : MIN_COMPRESS_SIZE;
  const maxSize = config ? config.maxCompressSize : RAW_CAP;

  if (bytesIn < minSize || bytesIn > maxSize) {
    stats.bytesAfter += bytesIn;
    return text;
  }

  const fn = autoDetectFilter(text);
  if (!fn) {
    stats.bytesAfter += bytesIn;
    return text;
  }

  // If config is provided, check if the filter is enabled
  if (config) {
    const filterName = fn.filterName || fn.name;
    const enabledFilters = config.enabledFilters;
    if (enabledFilters !== null && !enabledFilters[filterName]) {
      // Filter is disabled by config
      stats.bytesAfter += bytesIn;
      return text;
    }
  }

  const out = safeApply(fn, text);

  // Safety: never return empty, never grow the input
  if (!out || out.length === 0 || out.length >= bytesIn) {
    stats.bytesAfter += bytesIn;
    return text;
  }

  stats.bytesAfter += out.length;
  stats.hits.push({ shape, filter: fn.filterName || fn.name, saved: bytesIn - out.length });
  return out;
}

// Convenience: format a log line from stats
export function formatRtkLog(stats) {
  if (!stats || !stats.hits || stats.hits.length === 0) return null;
  const saved = stats.bytesBefore - stats.bytesAfter;
  const pct = stats.bytesBefore > 0 ? ((saved / stats.bytesBefore) * 100).toFixed(1) : "0";
  const filters = Array.from(new Set(stats.hits.map(h => h.filter))).join(",");
  return `[RTK] saved ${saved}B / ${stats.bytesBefore}B (${pct}%) via [${filters}] hits=${stats.hits.length}`;
}