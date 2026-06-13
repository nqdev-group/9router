import { MemoryStore } from "./memoryStore.js";
import { Summarizer } from "./summarizer.js";
import { ContextBuilder } from "./contextBuilder.js";
import { resolveCmemConfig } from "./configResolver.js";
import { Observer } from "../capture/observer.js";
import { Injector } from "../injection/injector.js";
import { injectOpenAI } from "../injection/formatters/openai.js";
import { injectClaude } from "../injection/formatters/claude.js";
import { injectGemini } from "../injection/formatters/gemini.js";
import { estimateTokens } from "../utils/tokens.js";

const FORMATS = {
  OPENAI: "openai",
  OPENAI_RESPONSES: "openai-responses",
  CLAUDE: "claude",
  GEMINI: "gemini",
  GEMINI_CLI: "gemini-cli",
  KIRO: "kiro",
  CURSOR: "cursor",
  ANTIGRAVITY: "antigravity",
};

export class CmemEngine {
  constructor({ enabled = false, config = {}, db } = {}) {
    this.enabled = enabled;
    this.config = resolveCmemConfig(config);

    this.store = db ? new MemoryStore(db, { retentionDays: this.config.observationRetentionDays }) : null;
    this.summarizer = new Summarizer({});
    this.contextBuilder = this.store ? new ContextBuilder(this.store) : null;
    this.observer = new Observer({ excludePrivateContent: this.config.excludePrivateContent });
    this.injector = new Injector();

    this.injector.registerFormatter(FORMATS.OPENAI, injectOpenAI);
    this.injector.registerFormatter(FORMATS.CLAUDE, injectClaude);
    this.injector.registerFormatter(FORMATS.GEMINI, injectGemini);
    this.injector.registerFormatter(FORMATS.GEMINI_CLI, injectGemini);
    this.injector.registerFormatter(FORMATS.OPENAI_RESPONSES, injectOpenAI);
    this.injector.registerFormatter(FORMATS.KIRO, injectOpenAI);
    this.injector.registerFormatter(FORMATS.CURSOR, injectOpenAI);
    this.injector.registerFormatter(FORMATS.ANTIGRAVITY, injectOpenAI);

    this._stats = {
      observationsCaptured: 0,
      contextInjections: 0,
      totalInjectionTokens: 0,
      totalInjectionCount: 0,
    };
  }

  async init() {
    if (this.store) await this.store.init();
  }

  async captureObservation({ model, messages, response, provider } = {}) {
    if (!this.enabled) return null;
    if (!this.store) return null;

    const observed = this.observer.observe({ model, messages, response, provider });
    if (!observed) return null;

    observed.provider = provider || observed.provider;

    const summary = await this.summarizer.summarize(observed);
    if (summary) {
      observed.summary = summary.summary;
      observed.facts = summary.facts;
      observed.concepts = summary.concepts;
    }

    await this.store.saveObservation(observed);
    this._stats.observationsCaptured++;
    return observed;
  }

  async injectContext(body, targetFormat, tokenBudget) {
    if (!this.enabled) return null;
    if (!this.contextBuilder) return null;
    if (!body) return null;

    const query = this._extractQuery(body);
    const contextResult = await this.contextBuilder.buildContext({
      query,
      tokenBudget: tokenBudget || this.config.tokenBudget,
      maxObservations: this.config.maxObservations,
      sections: this.config.contextSections,
    });

    if (!contextResult.context) return null;

    const injected = this.injector.inject(body, contextResult.context, targetFormat);
    if (injected) {
      this._stats.contextInjections++;
      this._stats.totalInjectionTokens += contextResult.totalTokens;
      this._stats.totalInjectionCount++;
    }
    return injected;
  }

  async search(query, options = {}) {
    if (!this.store) return { observations: [], total: 0 };
    return this.store.search(query, options);
  }

  async getTimeline(query, options = {}) {
    if (!this.store) return [];
    return this.store.getTimeline(query, options);
  }

  async getObservations(ids) {
    if (!this.store) return [];
    return this.store.getObservations(ids);
  }

  async deleteObservation(id) {
    if (!this.store) return;
    return this.store.deleteObservation(id);
  }

  async getStats() {
    const storeStats = this.store ? await this.store.getStats() : { totalObservations: 0, totalTokens: 0, byType: [] };
    const avgTokens = this._stats.totalInjectionCount > 0
      ? Math.round(this._stats.totalInjectionTokens / this._stats.totalInjectionCount)
      : 0;
    return {
      ...storeStats,
      observationsCaptured: this._stats.observationsCaptured,
      contextInjections: this._stats.contextInjections,
      avgInjectionTokens: avgTokens,
      totalInjectionTokens: this._stats.totalInjectionTokens,
    };
  }

  updateConfig(config) {
    this.config = resolveCmemConfig({ ...this.config, ...config });
  }

  _extractQuery(body) {
    const messages = body?.messages || body?.input || body?.contents || [];
    for (const msg of messages) {
      if (msg?.role === "user") {
        const text = typeof msg.content === "string" ? msg.content
          : Array.isArray(msg.content) ? msg.content.filter(p => p?.type === "text").map(p => p.text).join(" ")
          : "";
        if (text) return text.slice(0, 500);
      }
    }
    return "";
  }
}
