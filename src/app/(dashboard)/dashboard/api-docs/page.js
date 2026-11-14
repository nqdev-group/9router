"use client";

import { SwaggerUIEmbed } from "@9router/components";

const SPEC_URL = "/api/docs/internal-openapi";

export default function InternalApiDocsPage() {
  return (
    <div className="flex min-w-0 flex-col gap-4 px-1 sm:px-0">
      <div>
        <h1 className="text-2xl font-semibold">Internal API Docs</h1>
        <p className="text-sm text-text-muted/80 mt-1">
          ~150 dashboard/admin routes (settings, providers, oauth, keys, usage, cli-tools, ...). Path + summary +
          auth requirement only — lighter tier by design, no request/response body schemas (see{" "}
          <code>plans/2026-09-10-ollama-api-swagger-planning.md</code> §6). Regenerate with{" "}
          <code>node scripts/generate-internal-openapi.mjs</code> after adding/removing routes.
        </p>
        <p className="text-sm text-text-muted/80">
          Public client-facing API (Ollama-compatible + <code>/v1/*</code>) is documented separately at{" "}
          <a href="/docs/api" className="text-primary underline">/docs/api</a> (no login required).
        </p>
      </div>
      <SwaggerUIEmbed specUrl={SPEC_URL} domId="swagger-ui-internal" />
    </div>
  );
}
