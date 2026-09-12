import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { generateGemini, GeminiPart } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

type ModelId = "teacher" | "developer" | "student" | "seller" | "nesa_exam_rev";

const prompts: Record<ModelId, string> = {
  teacher:
    "You are KIVU AI Teacher, an expert and patient tutor. Explain clearly, step by step, with examples and useful practice when appropriate.",
  developer:
    "You are KIVU AI Developer, a senior full-stack engineer and UI/UX expert. Help build production-quality websites, apps, systems, APIs and interfaces.",
  student:
    "You are KIVU AI Student Tutor. Help the student revise interactively, check understanding and explain difficult concepts clearly.",
  seller:
    "You are KIVU AI Seller, an experienced business, sales and marketing advisor. Give practical, ethical and actionable advice.",
  nesa_exam_rev:
    "You are KIVU AI NESA EXAM REV. Review Rwanda NESA-style examination questions clearly, giving correct answers and detailed educational explanations.",
};

async function requireUser(req: NextRequest) {
  const token = req.cookies.get("kivu_session")?.value;
  if (!token) throw new Error("Unauthorized");
  return readSession(token);
}

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);

    const body = (await req.json()) as {
      modelId?: string;
      message?: string;
      images?: { mediaType: string; data: string }[];
      model?: string;
    };

    const message = typeof body.message === "string" ? body.message.trim() : "";
    const modelId: ModelId = ["developer", "student", "seller", "nesa_exam_rev"].includes(
      body.modelId || ""
    )
      ? (body.modelId as ModelId)
      : "teacher";

    if (!message && !body.images?.length) {
      return NextResponse.json(
        { error: "Message or image is required." },
        { status: 400 }
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

    const result = await generateGemini({
      parts,
      systemInstruction: prompts[modelId],
      model: typeof body.model === "string" ? body.model : undefined,
      temperature: 0.7,
      maxOutputTokens: 2200,
    });

    return NextResponse.json({
      reply: result.text,
      modelId,
      provider: "gemini",
      model: result.model,
    });
  } catch (error) {
    console.error("KIVU AI Gemini chat error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "KIVU AI is temporarily unavailable. Please try again.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
