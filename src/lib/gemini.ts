export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiRequest = {
  parts: GeminiPart[];
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
};

type GeminiModel = {
  name?: string;
  supportedGenerationMethods?: string[];
};

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const PREFERRED_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

let cachedModels: string[] | null = null;
let cacheUntil = 0;

function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "AI is not configured. Add GEMINI_API_KEY in Hostinger Environment Variables."
    );
  }
  return apiKey;
}

function normalizeModel(name: string) {
  return name.replace(/^models\//, "").trim();
}

async function listAvailableModels(apiKey: string, force = false) {
  if (!force && cachedModels && Date.now() < cacheUntil) return cachedModels;

  const response = await fetch(
    API_BASE + "/models?key=" + encodeURIComponent(apiKey),
    { cache: "no-store" }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      typeof data?.error?.message === "string"
        ? data.error.message
        : "Unable to check available Gemini models."
    );
  }

  const data = await response.json();
  cachedModels = (Array.isArray(data?.models) ? data.models : [])
    .filter(
      (model: GeminiModel) =>
        Array.isArray(model.supportedGenerationMethods) &&
        model.supportedGenerationMethods.includes("generateContent")
    )
    .map((model: GeminiModel) => normalizeModel(String(model.name || "")))
    .filter(Boolean);

  cacheUntil = Date.now() + 10 * 60 * 1000;
  return cachedModels;
}

async function selectModel(apiKey: string, requested?: string, force = false) {
  const available = await listAvailableModels(apiKey, force);
  const configured = normalizeModel(
    requested || process.env.GEMINI_MODEL || ""
  );

  if (configured && available.includes(configured)) return configured;

  for (const preferred of PREFERRED_MODELS) {
    if (available.includes(preferred)) return preferred;
  }

  const gemini = available.find((name) => name.startsWith("gemini-"));
  if (gemini) return gemini;

  throw new Error(
    "This Gemini API key has no model available for generateContent. Check the API key and Gemini API access."
  );
}

function extractText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";

  return parts
    .filter((part: any) => typeof part?.text === "string")
    .map((part: any) => part.text)
    .join("\n")
    .trim();
}

function providerError(status: number, data: any) {
  const message =
    typeof data?.error?.message === "string"
      ? data.error.message
      : "Gemini API request failed.";

  if (status === 400) return "Gemini could not process this request. Please check your message or file.";
  if (status === 401 || status === 403) {
    return "The Gemini API key is invalid or does not have permission to use the Gemini API.";
  }
  if (status === 404) {
    return "No compatible Gemini model is available for this API key.";
  }
  if (status === 429) {
    return "The Gemini free limit has been reached. Please wait and try again later.";
  }
  if (status >= 500) return "Gemini is temporarily busy. Please try again in a moment.";

  return message;
}

export async function generateGemini(request: GeminiRequest) {
  const apiKey = getApiKey();

  async function run(forceModelRefresh = false) {
    const model = await selectModel(apiKey, request.model, forceModelRefresh);

    const response = await fetch(
      API_BASE +
        "/models/" +
        encodeURIComponent(model) +
        ":generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ...(request.systemInstruction
            ? {
                systemInstruction: {
                  parts: [{ text: request.systemInstruction }],
                },
              }
            : {}),
          contents: [{ role: "user", parts: request.parts }],
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxOutputTokens ?? 2200,
          },
        }),
      }
    );

    const data = await response.json().catch(() => ({}));
    return { response, data, model };
  }

  let result = await run(false);

  // A configured model can disappear or be unavailable for a specific key.
  // Refresh the model list once and automatically fall back to a compatible model.
  if (result.response.status === 404) {
    cachedModels = null;
    cacheUntil = 0;
    result = await run(true);
  }

  if (!result.response.ok) {
    console.error(
      "Gemini API error:",
      result.response.status,
      result.data?.error?.message
    );
    throw new Error(providerError(result.response.status, result.data));
  }

  const text = extractText(result.data);
  if (!text) {
    const blockReason = result.data?.promptFeedback?.blockReason;
    throw new Error(
      blockReason
        ? "Gemini could not answer this request because of its safety rules."
        : "Gemini did not return a text response. Please try again."
    );
  }

  return { text, model: result.model };
}

export async function getAvailableGeminiModels() {
  const apiKey = getApiKey();
  return listAvailableModels(apiKey);
}
