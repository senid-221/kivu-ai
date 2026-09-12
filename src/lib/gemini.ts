export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { fileData: { mimeType: string; fileUri: string } };

export type GeminiUploadedFile = {
  uri: string;
  mimeType: string;
  name?: string;
};

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

async function listAvailableModels(apiKey: string, force = false): Promise<string[]> {
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
  const models: string[] = (Array.isArray(data?.models) ? data.models : [])
    .filter(
      (model: GeminiModel) =>
        Array.isArray(model.supportedGenerationMethods) &&
        model.supportedGenerationMethods.includes("generateContent")
    )
    .map((model: GeminiModel) => normalizeModel(String(model.name || "")))
    .filter(Boolean);

  cachedModels = models;
  cacheUntil = Date.now() + 10 * 60 * 1000;
  return models;
}

async function selectModel(apiKey: string, requested?: string, force = false) {
  const availableModels = await listAvailableModels(apiKey, force);
  const available: string[] = Array.isArray(availableModels)
    ? availableModels
    : [];
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

/**
 * Eduka displays clean plain text. Gemini may return Markdown such as
 * **bold**, *italic*, headings and asterisk bullets; remove those markers
 * before the response reaches the UI.
 */
export function cleanAiText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    // Markdown code fences: keep the code, remove the fence markers.
    .replace(/^\s*```[^\n]*\n?/gm, "")
    .replace(/^\s*```\s*$/gm, "")
    // Markdown headings.
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    // Asterisk bullets become a clean dash.
    .replace(/^\s*[*•]\s+/gm, "- ")
    // Bold / italic / stray Markdown emphasis markers.
    .replace(/\*{1,3}/g, "")
    // Remove internal retrieval disclaimers that should never be shown to EDUKA users.
    .replace(/^\s*Nta bimenyetso byavuye mu masoko[^\n.]*\.[\s\n]*/i, "")
    .replace(/^\s*Ibisobanuro bikurikira bishingiye ku bumenyi rusange[^\n.]*\.[\s\n]*/i, "")
    .replace(/^\s*(No matching source evidence was found|No verified external source was retrieved)[^.]*\.[\s\n]*/i, "")
    .replace(/^\s*(The following explanation is based on general knowledge)[^.]*\.[\s\n]*/i, "")
    // Remove empty lines created by formatting cleanup.
    .replace(/\n{3,}/g, "\n\n")
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

/**
 * Upload a larger document to the Gemini Files API. This avoids very large
 * base64 JSON requests and lets Gemini read PDFs with native document vision.
 */
export async function uploadGeminiFile(
  bytes: Uint8Array,
  mimeType: string,
  displayName: string
): Promise<GeminiUploadedFile> {
  const apiKey = getApiKey();

  const start = await fetch(
    "https://generativelanguage.googleapis.com/upload/v1beta/files?key=" +
      encodeURIComponent(apiKey),
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    }
  );

  if (!start.ok) {
    const data = await start.json().catch(() => ({}));
    throw new Error(providerError(start.status, data));
  }

  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini did not return a file upload URL.");

  // Make a fresh ArrayBuffer so TypeScript and the Fetch API agree on BodyInit.
  // Uint8Array<ArrayBufferLike> can otherwise fail Next.js production type checks.
  const uploadBody = new Uint8Array(bytes).buffer;

  const uploaded = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
      "Content-Type": mimeType,
    },
    body: uploadBody,
  });

  const data = await uploaded.json().catch(() => ({}));
  if (!uploaded.ok || !data?.file?.uri) {
    throw new Error(
      typeof data?.error?.message === "string"
        ? data.error.message
        : "Gemini could not upload this document."
    );
  }

  let file = data.file;

  // Some uploads (especially larger documents) need a short processing phase
  // before they can be passed to generateContent.
  if (typeof file?.name === "string") {
    for (let attempt = 0; attempt < 20; attempt++) {
      const state = String(file?.state || "ACTIVE").toUpperCase();
      if (state === "ACTIVE" || !file?.state) break;
      if (state === "FAILED") {
        throw new Error("Gemini could not process this uploaded document.");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const status = await fetch(
        API_BASE + "/" + encodeURIComponent(file.name) + "?key=" + encodeURIComponent(apiKey),
        { cache: "no-store" }
      );
      const statusData = await status.json().catch(() => ({}));
      if (!status.ok) {
        throw new Error(
          typeof statusData?.error?.message === "string"
            ? statusData.error.message
            : "Unable to check the uploaded document."
        );
      }
      file = statusData.file || statusData;
    }

    if (String(file?.state || "ACTIVE").toUpperCase() === "PROCESSING") {
      throw new Error("The uploaded document is taking too long to prepare. Please try again.");
    }
  }

  return {
    uri: String(file.uri),
    mimeType: String(file.mimeType || mimeType),
    name: typeof file.name === "string" ? file.name : undefined,
  };
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

  return { text: cleanAiText(text), model: result.model };
}

export async function getAvailableGeminiModels() {
  const apiKey = getApiKey();
  return listAvailableModels(apiKey);
}
