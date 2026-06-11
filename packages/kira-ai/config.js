export const KIRA_PROVIDER_ID = "kira";

export const KIRA_PROVIDER_CONFIG = {
  baseUrl: "https://kiraai.vn/api/v1",
  format: "openai",
  headers: {}
};

export const KIRA_MODELS = [
  { id: "kira-3.5-flash", name: "Kira 3.5 Flash" },
  { id: "kira-2.5-pro", name: "Kira 2.5 Pro" },
  { id: "kira-3-pro-image-preview", name: "Kira 3 Pro Image", type: "image", params: ["n", "size"] },
  { id: "kira-3.1-flash-image-preview", name: "Kira 3.1 Flash Image", type: "image", params: ["n", "size"] },
  { id: "kira-3.1-generate-001", name: "Kira 3.1 Generate", type: "video", params: [] },
];
