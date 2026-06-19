import { estimateTokens } from "../utils/tokens.js";

const COMPRESSION_PROMPT = `You are a compression engine. Compress the following content into a concise summary preserving key facts, decisions, and code references. Output JSON with fields: "summary" (1-3 sentences), "facts" (array of bullet-point strings), "concepts" (array of 2-5 tag strings). Do NOT add information not present in the input.`;

export class Summarizer {
  constructor({ modelEndpoint, modelName, authToken } = {}) {
    this.modelEndpoint = modelEndpoint || null;
    this.modelName = modelName || "gpt-4o-mini";
    this.authToken = authToken;
  }

  async summarize(observation, { signal } = {}) {
    if (!observation || !observation.content) return null;

    const contentTokens = estimateTokens(observation.content);
    if (contentTokens < 100) {
      return this._simpleSummary(observation);
    }

    if (!this.modelEndpoint) {
      return this._simpleSummary(observation);
    }

    try {
      const result = await this._callLLM(observation.content, signal);
      return result;
    } catch {
      return this._simpleSummary(observation);
    }
  }

  _simpleSummary(observation) {
    const content = observation.content || "";
    const firstLine = content.split("\n")[0] || "";
    const lines = content.split("\n").filter(l => l.trim());
    const facts = lines.slice(0, 5).map(l => l.replace(/^[-*\s]+/, "").slice(0, 200));
    const concepts = [];
    const words = content.toLowerCase().split(/\W+/);
    const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "this", "that", "it", "to", "in", "for", "of", "and", "or", "with"]);
    for (const w of words) {
      if (w.length > 4 && !stopWords.has(w) && !concepts.includes(w)) {
        concepts.push(w);
        if (concepts.length >= 5) break;
      }
    }
    return {
      summary: firstLine.slice(0, 300) || "No summary available",
      facts: facts.slice(0, 3),
      concepts: concepts.slice(0, 5),
    };
  }

  async _callLLM(content, signal) {
    const response = await fetch(this.modelEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.authToken ? { "Authorization": `Bearer ${this.authToken}` } : {}),
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [
          { role: "system", content: COMPRESSION_PROMPT },
          { role: "user", content: content.slice(0, 16000) },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
      signal,
    });

    if (!response.ok) throw new Error(`LLM summarize failed: ${response.status}`);

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    return {
      summary: parsed.summary || content.slice(0, 300),
      facts: Array.isArray(parsed.facts) ? parsed.facts.slice(0, 10) : [],
      concepts: Array.isArray(parsed.concepts) ? parsed.concepts.slice(0, 10) : [],
    };
  }
}
