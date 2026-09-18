// create/copy/pull/push/delete manage a local model FILE on disk — 9Router
// routes to remote provider APIs and never stores model files locally, so
// there is nothing for these to actually do. Returning 501 with a clear
// reason is preferred over silently faking success (which would mislead a
// client into thinking a model was pulled/deleted when nothing happened) —
// confirmed out-of-scope with stakeholder, see
// plans/2026-09-10-ollama-api-swagger-planning.md §6.
export function buildNotImplementedMessage(action) {
  return {
    error: `${action} is not supported — 9Router routes to remote provider APIs, it does not store local model files.`,
  };
}
