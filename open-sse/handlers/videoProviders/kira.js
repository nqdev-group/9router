// Kira AI video jobs — https://kiraai.vn/documents/
//
// Async shape like xAI (POST creates a job, GET polls status), but the poll path
// is NOT "{baseUrl}/{id}" like the default (xAI) shape assumes — it's nested under
// "operations/". Confirmed live: GET {baseUrl}/{id} 404s, GET {baseUrl}/operations/{id}
// 401s (route exists, needs a real key). Create-only today (no edits/extensions
// endpoint documented); reference_images (image-to-video) still POSTs to /generations
// with an extra body field, same URL.
const SUPPORTED_ACTIONS = new Set(["generations"]);

function headers(token, contentType) {
  const h = { Accept: "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (contentType) h["Content-Type"] = contentType;
  return h;
}

export default {
  buildRequest({ config, action, requestId, rawBody, contentType, token }) {
    const base = config.baseUrl.replace(/\/$/, "");

    if (requestId) {
      return { method: "GET", url: `${base}/operations/${encodeURIComponent(requestId)}`, headers: headers(token) };
    }
    if (!SUPPORTED_ACTIONS.has(action)) {
      return { error: `Kira video supports 'generations' only (got '${action}')` };
    }
    return {
      method: "POST",
      url: `${base}/${action}`,
      headers: headers(token, contentType || "application/json"),
      body: rawBody,
    };
  },
};
