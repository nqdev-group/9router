import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Regression guard for scripts/generate-internal-openapi.mjs's output — same
// class of "hand-edit broke the JSON structure silently" risk as
// ollama-public-openapi-spec.test.js, plus a scope check specific to this
// file: it must document ADMIN routes only, never the public /v1 surface
// (that's public/openapi/ollama-public.json's job).
const specPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/app/api/docs/internal-openapi/spec.json");

describe("internal OpenAPI spec (dashboard/api-docs page)", () => {
  it("is valid, parseable JSON", () => {
    expect(() => JSON.parse(readFileSync(specPath, "utf8"))).not.toThrow();
  });

  it("declares bearerAuth as a security scheme", () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    expect(spec.components.securitySchemes.bearerAuth.type).toBe("http");
  });

  it("never documents /v1 or /v1beta paths — those belong to the public spec only", () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    for (const path of Object.keys(spec.paths)) {
      expect(path.startsWith("/api/v1/")).toBe(false);
      expect(path.startsWith("/api/v1beta/")).toBe(false);
    }
  });

  it("has a substantial number of documented admin paths (sanity floor)", () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    expect(Object.keys(spec.paths).length).toBeGreaterThan(100);
  });

  it("classifies a known public path, an always-protected path, and a default-protected path correctly", () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    expect(spec.paths["/api/health"].get["x-9router-auth"]).toMatch(/^Public/);
    expect(spec.paths["/api/shutdown"].post["x-9router-auth"]).toMatch(/^Always protected/);
    expect(spec.paths["/api/settings"].get["x-9router-auth"]).toMatch(/^Protected/);
  });

  it("marks a known catch-all route ([...path]) with an explanatory note", () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    const entry = spec.paths["/api/headroom/proxy/{path}"];
    expect(entry).toBeTruthy();
    const op = entry.get || entry.post;
    expect(op["x-9router-note"]).toBe("catch-all path segment(s)");
  });
});
