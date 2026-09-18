"use client";

import { SwaggerUIEmbed } from "@9router/components";

const SPEC_URL = "/openapi/ollama-public.json";

export default function PublicApiDocsPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e5e5", fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>9Router — Public API Docs</h1>
        <p style={{ margin: "4px 0 0", color: "#555", fontSize: 14 }}>
          Ollama-compatible API (<code>/v1/ollama/api/*</code>) and the OpenAI/Claude/Gemini-compatible client
          gateway (<code>/v1/*</code>). Click <strong>Authorize</strong> to try requests with a real API key.
          Internal/admin routes are documented separately behind dashboard login.
        </p>
      </div>
      <SwaggerUIEmbed specUrl={SPEC_URL} />
    </div>
  );
}
