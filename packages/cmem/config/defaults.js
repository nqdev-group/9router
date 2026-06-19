export const DEFAULT_CMEM_CONFIG = {
  mode: "code",
  tokenBudget: 4000,
  historyDepth: "session",
  maxObservations: 20,
  compressionModel: null,
  summarizationEnabled: true,
  searchMode: "fts",
  contextSections: ["recent", "relevant", "project-facts"],
  excludePrivateContent: true,
  observationRetentionDays: 90,
};
