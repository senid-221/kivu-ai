import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readSession } from "@/lib/auth";

type ModelId = "teacher" | "developer" | "student" | "seller" | "nesa_exam_rev";

const prompts: Record<ModelId, string> = {
  teacher: "You are KIVU AI Teacher, an expert and patient tutor. Explain clearly, step by step, with examples and useful practice when appropriate.",
  developer: "You are KIVU AI Developer, a senior full-stack engineer and UI/UX expert. Help build production-quality websites, apps, systems, APIs and interfaces.",
  student: "You are KIVU AI Student Tutor. Help the student revise interactively as if you are studying together. Check understanding and explain difficult concepts clearly.",
  seller: "You are KIVU AI Seller, an experienced business, sales and marketing advisor. Give practical, ethical and actionable advice.",
  nesa_exam_rev: "You are KIVU AI NESA EXAM REV. Review Rwanda NESA-style examination questions one by one. Give the correct answer and detailed educational explanation.",
};

async function requireUser(req: NextRequest) {
  const token = req.cookies.get("kivu_session")?.value;
  if (!token) throw new Error("Unauthorized");
  return readSession(token);
}

function getText(response: Anthropic.Messages.Message) {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    const body: { modelId?: string; message?: string; images?: { mediaType: string; data: string }[] } = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const modelId: ModelId = body.modelId === "developer" || body.modelId === "student" || body.modelId === "seller" || body.modelId === "nesa_exam_rev" ? body.modelId : "teacher";

    if (!message && !(body.images?.length)) return NextResponse.json({ error: "Message or image is required." }, { status: 400 });

    const content: Anthropic.Messages.ContentBlockParam[] = [];
    for (const image of body.images || []) {
      if (typeof image.data === "string" && image.data.length && /^image\/(jpeg|png|gif|webp)$/.test(image.mediaType)) {
        content.push({ type: "image", source: { type: "base64", media_type: image.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: image.data } });
      }
    }
    if (message) content.push({ type: "text", text: message });

    const apiKey = process.env.ANTHROPIC_API_KEY;\n    if (!apiKey) return NextResponse.json({ error: "AI service is not configured. Add ANTHROPIC_API_KEY in your hosting environment variables." }, { status: 503 });\n    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 2200,
      system: prompts[modelId],
      messages: [{ role: "user", content }]
    });

    return NextResponse.json({ reply: getText(response) || "I could not generate a response. Please try again.", modelId });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const message = error instanceof Error ? error.message : "Unknown AI service error";\n    console.error("KIVU AI chat error:", error);\n    return NextResponse.json({ error: "Unable to complete this request right now.", details: process.env.NODE_ENV === "development" ? message : undefined }, { status: 500 });
  }
}