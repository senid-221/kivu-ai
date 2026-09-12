import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

type ModelId = "teacher" | "developer" | "student" | "seller" | "nesa_exam_rev";

const prompts: Record<ModelId, string> = {
  teacher: "You are KIVU AI Teacher, an expert and patient tutor. Explain clearly, step by step, with examples and useful practice when appropriate.",
  developer: "You are KIVU AI Developer, a senior full-stack engineer and UI/UX expert. Help build production-quality websites, apps, systems, APIs and interfaces.",
  student: "You are KIVU AI Student Tutor. Help the student revise interactively as if you are studying together. Check understanding and explain difficult concepts clearly.",
  seller: "You are KIVU AI Seller, an experienced business, sales and marketing advisor. Give practical, ethical and actionable advice.",
  nesa_exam_rev: "You are KIVU AI NESA EXAM REV. Review Rwanda NESA-style examination questions one by one. Give the correct answer and detailed educational explanation.",
};

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

async function requireUser(req: NextRequest) {
  const token = req.cookies.get("kivu_session")?.value;
  if (!token) throw new Error("Unauthorized");
  return readSession(token);
}

function getGeminiText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part) => typeof part?.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);

    const body = await req.json() as {
      modelId?: string;
      message?: string;
      images?: { mediaType: string; data: string }[];
    };

    const message = typeof body.message === "string" ? body.message.trim() : "";
    const modelId: ModelId = ["developer", "student", "seller", "nesa_exam_rev"].includes(body.modelId || "")
      ? body.modelId as ModelId
      : "teacher";

    if (!message && !body.images?.length) {
      return NextResponse.json({ error: "Message or image is required." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI is not configured. Add GEMINI_API_KEY in Hostinger Environment Variables." },
        { status: 503 }
      );
    }

    const parts: GeminiPart[] = [];

    for (const image of body.images || []) {
      if (
        typeof image?.data === "string" &&
        image.data.length &&
        /^image\/(jpeg|png|gif|webp)$/i.test(image.mediaType || "")
      ) {
        parts.push({
          inlineData: {
            mimeType: image.mediaType,
            data: image.data,
          },
        });
      }
    }

    if (message) parts.push({ text: message });

    // You can override this in Hostinger with GEMINI_MODEL.
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) +
        ":generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: prompts[modelId] }],
          },
          contents: [
            {
              role: "user",
              parts,
            },
          ],
          generationConfig: {
            maxOutputTokens: 2200,
            temperature: 0.7,
          },
        }),
        cache: "no-store",
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const providerMessage =
        typeof data?.error?.message === "string"
          ? data.error.message
          : "Gemini API request failed.";

      console.error("Gemini API error:", response.status, providerMessage);

      let errorMessage = "KIVU AI could not complete this request right now. Please try again.";
      if (response.status === 400) {
        errorMessage = "KIVU AI could not process this request. Please check your message or file.";
      } else if (response.status === 401 || response.status === 403) {
        errorMessage = "The Gemini API key is invalid or does not have permission to use the Gemini API.";
      } else if (response.status === 404) {
        errorMessage = "The selected Gemini model is not available for this API key. Check GEMINI_MODEL.";
      } else if (response.status === 429) {
        errorMessage = "The Gemini free limit has been reached. Please wait and try again later.";
      } else if (response.status >= 500) {
        errorMessage = "Gemini is temporarily busy. Please try again in a moment.";
      }

      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const reply = getGeminiText(data);

    if (!reply) {
      const blockReason = data?.promptFeedback?.blockReason;
      return NextResponse.json(
        {
          error: blockReason
            ? "Gemini could not answer this request because of its safety rules."
            : "Gemini did not return a text response. Please try again.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ reply, modelId, provider: "gemini", model });
  } catch (error) {
    console.error("KIVU AI Gemini chat error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
    }

    return NextResponse.json(
      { error: "KIVU AI is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
