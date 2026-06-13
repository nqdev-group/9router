// LRU cache for identical LLM responses
// Cache key: hash(model, messages, temperature, max_tokens)
// TTL: configurable (default 5min), max entries: configurable (default 100)

import crypto from "node:crypto";

const DEFAULT_MAX_SIZE = 100;
const DEFAULT_TTL_MS = 5 * 60 * 1000;

export class ResponseCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || DEFAULT_MAX_SIZE;
    this.ttlMs = options.ttlMs || DEFAULT_TTL_MS;
    this._map = new Map();
    this._hits = 0;
    this._misses = 0;
    this._evictions = 0;
  }

  get(model, messages, params) {
    const key = this._makeKey(model, messages, params);
    const entry = this._map.get(key);
    if (!entry) { this._misses++; return null; }
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this._map.delete(key);
      this._evictions++;
      this._misses++;
      return null;
    }
    this._map.delete(key);
    this._map.set(key, entry);
    this._hits++;
    return { content: entry.content, usage: entry.usage };
  }

  set(model, messages, params, response) {
    const key = this._makeKey(model, messages, params);
    if (this._map.has(key)) return;
    if (this._map.size >= this.maxSize) {
      const oldest = this._map.keys().next().value;
      if (oldest) { this._map.delete(oldest); this._evictions++; }
    }
    this._map.set(key, {
      content: response.content,
      usage: response.usage || null,
      timestamp: Date.now()
    });
  }

  invalidate(pattern) {
    if (!pattern) { this._map.clear(); return; }
    const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, "i");
    for (const key of this._map.keys()) {
      if (re.test(key)) this._map.delete(key);
    }
  }

  stats() {
    const total = this._hits + this._misses;
    return {
      size: this._map.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
      hits: this._hits,
      misses: this._misses,
      hitRate: total > 0 ? (this._hits / total * 100).toFixed(1) + "%" : "0%",
      evictions: this._evictions
    };
  }

  _makeKey(model, messages, params = {}) {
    const parts = [model, JSON.stringify(messages)];
    if (params.temperature !== undefined) parts.push(String(params.temperature));
    if (params.max_tokens !== undefined) parts.push(String(params.max_tokens));
    if (params.top_p !== undefined) parts.push(String(params.top_p));
    return crypto.createHash("md5").update(parts.join("||")).digest("hex");
  }
}

let _instance = null;

export function getResponseCache() {
  if (!_instance) _instance = new ResponseCache();
  return _instance;
}

export function resetResponseCache() {
  _instance = null;
}
