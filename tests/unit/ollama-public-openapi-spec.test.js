import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Guards against the exact mistake made while authoring this file the first
// time: a hand-typed JSON.stringify-equivalent structure with one extra
// closing brace, which parsed "successfully" up to a point and silently
// dropped the rest of the paths. Cheap enough to run on every test pass.
const specPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/openapi/ollama-public.json");

describe("public OpenAPI spec (docs/api page)", () => {
  it("is valid, parseable JSON", () => {
    expect(() => JSON.parse(readFileSync(specPath, "utf8"))).not.toThrow();
  });

  it("declares bearerAuth as a security scheme", () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    expect(spec.components.securitySchemes.bearerAuth.type).toBe("http");
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
    expect(spec.security).toEqual([{ bearerAuth: [] }]);
  });

  it("documents every implemented/stubbed Ollama route under /v1/ollama/api/*", () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    const expected = [
      "/v1/ollama/api/chat",
      "/v1/ollama/api/generate",
      "/v1/ollama/api/embed",
      "/v1/ollama/api/tags",
      "/v1/ollama/api/ps",
      "/v1/ollama/api/show",
      "/v1/ollama/api/version",
      "/v1/ollama/api/create",
      "/v1/ollama/api/copy",
      "/v1/ollama/api/pull",
      "/v1/ollama/api/push",
      "/v1/ollama/api/delete",
    ];
    for (const path of expected) expect(spec.paths).toHaveProperty(path);
  });

  it("does not document any internal/admin dashboard route (public spec must stay scoped)", () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    const forbiddenPrefixes = ["/api/settings", "/api/providers", "/api/keys", "/api/oauth", "/api/usage", "/api/cli-tools"];
    for (const path of Object.keys(spec.paths)) {
      for (const prefix of forbiddenPrefixes) {
        expect(path.startsWith(prefix)).toBe(false);
      }
    }
  });
});
