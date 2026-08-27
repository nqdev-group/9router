/**
 * Builds a synthetic Web Standard Request that mimics a real /v1/* HTTP call,
 * so MCP tools can call straight into src/sse/handlers/*.js — the same
 * combo-loop/account-fallback/translation logic the real REST endpoints use —
 * without duplicating any of it.
 *
 * @param {Object} opts
 * @param {string} opts.path - e.g. "/v1/chat/completions" (only used to build a plausible URL; handlers mostly read pathname for format detection)
 * @param {Object} opts.body - JSON body
 * @param {import("@modelcontextprotocol/sdk/server/auth/types.js").AuthInfo} [opts.authInfo] - forwarded from the MCP transport (see httpHandler.js)
 * @returns {Request}
 */
export function buildProxyRequest({ path, body, authInfo }) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (authInfo?.token) {
    headers.set("Authorization", `Bearer ${authInfo.token}`);
  }

  return new Request(`http://internal.9router/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

/**
 * Same as buildProxyRequest but for handlers expecting multipart/form-data
 * (only src/sse/handlers/stt.js today, which reads request.formData()).
 * Caller builds the FormData itself (needed for the 3-arg `.set(key, blob, filename)`
 * form when attaching a file).
 *
 * @param {Object} opts
 * @param {string} opts.path
 * @param {FormData} opts.formData
 * @param {import("@modelcontextprotocol/sdk/server/auth/types.js").AuthInfo} [opts.authInfo]
 * @returns {Request}
 */
export function buildProxyFormRequest({ path, formData, authInfo }) {
  const headers = new Headers();
  if (authInfo?.token) {
    headers.set("Authorization", `Bearer ${authInfo.token}`);
  }

  return new Request(`http://internal.9router/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers,
    body: formData,
  });
}

/**
 * Converts a handler's Web Standard Response into an MCP CallToolResult.
 * Non-2xx responses are surfaced as tool errors (isError: true) rather than thrown,
 * so the calling agent sees the upstream error message instead of a generic MCP failure.
 *
 * @param {Response} response
 * @returns {Promise<{content: Array<{type: "text", text: string}>, isError?: boolean}>}
 */
export async function responseToToolResult(response) {
  const text = await response.text();
  if (!response.ok) {
    return {
      isError: true,
      content: [{ type: "text", text: `HTTP ${response.status}: ${text}` }],
    };
  }
  return { content: [{ type: "text", text }] };
}
