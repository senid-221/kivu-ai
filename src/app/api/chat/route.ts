import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type ModelId = "teacher" | "developer" | "student" | "seller" | "nesa_exam_rev";

const prompts: Record<ModelId, string> = {
  teacher: "You are KIVU Teacher. Explain clearly, accurately and step by step.",
  developer: "You are KIVU Developer, a senior engineer who builds production websites, apps, systems, APIs and UI.",
  student: "You are KIVU Student Tutor. Teach interactively and encourage understanding.",
  seller: "You are KIVU Seller, an experienced business, marketing and sales strategist.",
  nesa_exam_rev: "You are KIVU NESA EXAM Rev. Review examination questions one by one with correct answers and detailed explanations.",
};

export async function POST(req: NextRequest) {
  try {
    const body: { modelId?: string; message?: string } = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const modelId = body.modelId in prompts ? body.modelId as ModelId : "teacher";

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service is temporarily unavailable." }, { status: 503 });
    }

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: prompts[modelId] },
        { role: "user", content: message },
      ],
    });

    return NextResponse.json({
      reply: completion.choices[0]?.message?.content || "Please try again.",
    });
  } catch {
    return NextResponse.json({ error: "Unable to complete this request right now." }, { status: 500 });
  }
}
