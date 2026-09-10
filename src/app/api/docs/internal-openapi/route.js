import spec from "./spec.json" with { type: "json" };

// GET /api/docs/internal-openapi — serves the internal/admin OpenAPI spec.
// Path starts with /api/ and is not in dashboardGuard.js's public allow-list,
// so it inherits the default deny-by-default gate (JWT/CLI token or
// requireLogin=false) automatically — same protection as every other
// dashboard-management route, no extra auth code needed here.
//
// Regenerate spec.json with `node scripts/generate-internal-openapi.mjs`
// whenever routes are added/removed under src/app/api/ (outside v1/v1beta).
export async function GET() {
  return Response.json(spec);
}
