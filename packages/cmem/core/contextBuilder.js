import { TokenBudget } from "./tokenBudget.js";
import { estimateTokens } from "../utils/tokens.js";

export class ContextBuilder {
  constructor(store) {
    this.store = store;
  }

  async buildContext({ query, tokenBudget, maxObservations = 20, sections = ["recent", "relevant", "project-facts"] } = {}) {
    const budget = new TokenBudget(tokenBudget || 4000);
    const contextParts = [];

    if (sections.includes("recent")) {
      const recent = await this._buildRecentSection(maxObservations);
      contextParts.push(...recent);
    }

    if (sections.includes("relevant") && query) {
      const relevant = await this._buildRelevantSection(query, maxObservations);
      const existingIds = new Set(contextParts.map(p => p.id).filter(Boolean));
      for (const part of relevant) {
        if (!existingIds.has(part.id)) contextParts.push(part);
      }
    }

    if (sections.includes("project-facts")) {
      const facts = await this._buildFactsSection();
      contextParts.push(...facts);
    }

    const assembled = [];
    let totalTokens = 0;
    for (const part of contextParts) {
      const tokens = part.tokens || estimateTokens(part.text || "");
      if (budget.canFit(tokens)) {
        budget.consume(tokens);
        totalTokens += tokens;
        assembled.push(part);
      }
    }

    return {
      context: assembled.map(p => p.text || "").filter(Boolean).join("\n\n"),
      parts: assembled,
      totalTokens,
      budgetUsed: budget.used,
      budgetRemaining: budget.remaining(),
    };
  }

  async _buildRecentSection(limit) {
    if (!this.store) return [];
    const result = await this.store.search("", { limit });
    return result.observations.map(o => ({
      id: o.id,
      text: `[Memory ${o.type}] ${o.title}\n${o.summary || o.content?.slice(0, 500)}`,
      tokens: estimateTokens(o.summary || o.content || ""),
      type: o.type,
      createdAt: o.createdAt,
    }));
  }

  async _buildRelevantSection(query, limit) {
    if (!this.store || !query) return [];
    const result = await this.store.search(query, { limit });
    return result.observations.map(o => ({
      id: o.id,
      text: `[Memory ${o.type}] ${o.title}\n${o.summary || o.content?.slice(0, 500)}`,
      tokens: estimateTokens(o.summary || o.content || ""),
      type: o.type,
      createdAt: o.createdAt,
    }));
  }

  async _buildFactsSection() {
    if (!this.store) return [];
    const stats = await this.store.getStats();
    if (stats.totalObservations === 0) return [];

    const highLevel = stats.byType.filter(t => t.count > 0).map(t => `${t.type}: ${t.count}`).join(", ");
    return [{
      text: `[Project Memory] ${stats.totalObservations} observations captured (${highLevel}). Total ${stats.totalTokens} tokens stored.`,
      tokens: 30,
    }];
  }
}
