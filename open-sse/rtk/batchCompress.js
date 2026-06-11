import { autoDetectFilter } from "./autodetect.js";
import { safeApply } from "./applyFilter.js";

const SEP = "\n---BATCH-SEP---\n";

export function batchCompressTexts(texts, config) {
  if (!texts || texts.length < 2) return null;
  const minSize = config ? config.minCompressSize : 200;
  const maxSize = config ? config.maxCompressSize : 10485760;

  const totalBefore = texts.reduce((s, t) => s + t.length, 0);
  if (totalBefore < minSize || totalBefore > maxSize) return null;

  const separatorLen = SEP.length;

  const combined = texts.map((t, i) => (i > 0 ? SEP : "") + t).join("");
  const combinedBefore = combined.length;

  const fn = autoDetectFilter(combined);
  if (!fn) return null;

  if (config) {
    const filterName = fn.filterName || fn.name;
    const enabledFilters = config.enabledFilters;
    if (enabledFilters !== null && !enabledFilters[filterName]) return null;
  }

  const out = safeApply(fn, combined);
  if (!out || out.length === 0 || out.length >= combinedBefore) return null;

  const parts = splitByOriginalRatio(out, texts, combinedBefore, totalBefore);
  const valid = parts.length === texts.length && parts.reduce((s, t) => s + t.length, 0) < totalBefore;
  return valid ? parts : null;
}

function splitByOriginalRatio(compressed, originals, combinedBefore, totalBefore) {
  const attempts = [trySplitBySep(compressed), trySplitByRatio(compressed, originals, combinedBefore)];
  for (const result of attempts) {
    if (result && result.length === originals.length) {
      const totalAfter = result.reduce((s, t) => s + t.length, 0);
      if (totalAfter < totalBefore) return result;
    }
  }
  return null;
}

function trySplitBySep(compressed) {
  const parts = compressed.split(SEP);
  return parts.length >= 2 ? parts : null;
}

function trySplitByRatio(compressed, originals, combinedBefore) {
  if (combinedBefore <= 0) return null;
  const ratio = compressed.length / combinedBefore;
  const parts = [];
  let cursor = 0;
  for (const orig of originals) {
    const sliceLen = Math.round(orig.length * ratio);
    if (orig.length <= 0) { parts.push(""); continue; }
    const end = Math.min(cursor + sliceLen, compressed.length);
    const segment = compressed.slice(cursor, end);
    if (!segment) return null;
    parts.push(segment);
    cursor = end;
  }
  if (cursor < compressed.length) {
    parts[parts.length - 1] += compressed.slice(cursor);
  }
  return parts;
}
