"use client";

import { useEffect } from "react";

// Pinned to the v5 major line via jsdelivr's semver range resolution — no npm
// dependency added for this (see plans/2026-09-10-ollama-api-swagger-planning.md).
// Deliberately loads only swagger-ui-bundle.js (core UI + Authorize modal),
// never swagger-ui-standalone-preset.js — the standalone preset adds a top
// URL bar letting a visitor point this viewer at an arbitrary external spec,
// which neither the public nor the internal docs page should offer.
const SWAGGER_CSS_URL = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css";
const SWAGGER_BUNDLE_URL = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js";

function loadStylesheet(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

/**
 * Renders Swagger UI against a fixed spec URL. Shared by the public
 * (src/app/docs/api) and internal (dashboard/api-docs) docs pages so the
 * CDN-loading + Authorize-button setup isn't duplicated between them.
 */
export function SwaggerUIEmbed({ specUrl, domId = "swagger-ui" }) {
  useEffect(() => {
    let cancelled = false;
    loadStylesheet(SWAGGER_CSS_URL);
    loadScript(SWAGGER_BUNDLE_URL)
      .then(() => {
        if (cancelled || !window.SwaggerUIBundle) return;
        window.SwaggerUIBundle({
          url: specUrl,
          dom_id: `#${domId}`,
          presets: [window.SwaggerUIBundle.presets.apis],
          layout: "BaseLayout",
          deepLinking: true,
          persistAuthorization: true,
        });
      })
      .catch((err) => console.error("Failed to load Swagger UI:", err));
    return () => { cancelled = true; };
  }, [specUrl, domId]);

  return <div id={domId} />;
}
