export const KIRA_PROVIDER_ID = "kira";

export const KIRA_PROVIDER_CONFIG = {
  baseUrl: "https://kiraai.vn/api/v1",
  format: "openai",
  headers: {}
};

/**
 * Kira models configuration. The `params` field specifies the additional parameters required for image or video generation models.
 * For example, image generation models require `n` (number of images) and `size` (image dimensions) parameters.
 * Video generation models may require different parameters, which can be added to the `params` array as needed.
 * The `type` field indicates the type of model, which can be "text", "image", or "video". This can be used to determine how to handle requests for each model type.
 */
export const KIRA_MODELS = [
  { id: "kira-3.5-flash", name: "Kira 3.5 Flash" },
  { id: "kira-2.5-pro", name: "Kira 2.5 Pro" },
  { id: "kira-3-pro-image-preview", name: "Kira 3 Pro Image", type: "image", params: ["n", "size"] },
  { id: "kira-3.1-flash-image-preview", name: "Kira 3.1 Flash Image", type: "image", params: ["n", "size"] },
  { id: "kira-3.1-generate-001", name: "Kira 3.1 Generate", type: "video", params: [] },
  { id: "kira-2.5-flash", name: "Kira 2.5 Flash (TTS)", type: "tts" },
];
