const KIRA_IMAGE_URL = "https://kiraai.vn/api/v1/images/generations";

const sizeMap = {
  "1024x1024": "1:1", "1792x1024": "16:9", "1024x1792": "9:16",
  "1536x1024": "4:3", "1024x1536": "3:4",
};

export default {
  buildUrl: () => KIRA_IMAGE_URL,
  buildHeaders: (creds) => {
    const headers = { "Content-Type": "application/json" };
    const key = creds?.apiKey || creds?.accessToken;
    if (key) headers["Authorization"] = `Bearer ${key}`;
    return headers;
  },
  buildBody: (model, body) => {
    const { prompt, n = 1, size = "1024x1024" } = body;
    return { model, prompt, n, aspect_ratio: sizeMap[size] || "1:1" };
  },
  normalize: (responseBody) => responseBody,
};
