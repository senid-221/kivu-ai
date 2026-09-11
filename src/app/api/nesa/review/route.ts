import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

type Review = {
  correctAnswer: string;
  explanation: string;
  keyConcept: string;
  revisionTip: string;
};

function extractText(response: Anthropic.Messages.Message) {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

function parseReview(text: string): Review {
  const fallback: Review = {
    correctAnswer: "",
    explanation: text.trim() || "Unable to generate an explanation.",
    keyConcept: "",
    revisionTip: "",
  };

  try {
    const cleaned = text.trim().replace(/^\`\`\`json\s*/i, "").replace(/^\`\`\`\s*/i, "").replace(/\`\`\`$/i, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<Review>;
    return {
      correctAnswer: typeof parsed.correctAnswer === "string" ? parsed.correctAnswer : "",
      explanation: typeof parsed.explanation === "string" ? parsed.explanation : fallback.explanation,
      keyConcept: typeof parsed.keyConcept === "string" ? parsed.keyConcept : "",
      revisionTip: typeof parsed.revisionTip === "string" ? parsed.revisionTip : "",
    };
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: { question?: unknown; options?: unknown; subject?: unknown } = await req.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const options = typeof body.options === "string" ? body.options.trim() : "";
    const subject = typeof body.subject === "string" && body.subject.trim() ? body.subject.trim() : "General";

    if (!question) {
      return NextResponse.json({ error: "Please provide a question." }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 1800,
      system: "You are KIVU NESA EXAM Rev, an expert Rwandan secondary education examination tutor. Be accurate, educational and concise. Return only valid JSON.",
      messages: [{
        role: "user",
        content: `Review this examination question carefully. Subject: ${subject}. Return ONLY valid JSON with keys correctAnswer, explanation, keyConcept, revisionTip. Explain the answer clearly and educationally, one question at a time. Question: ${question} Options: ${options || "No options provided."}`,
      }],
    });

    return NextResponse.json(parseReview(extractText(response)));
  } catch {
    return NextResponse.json(
      { error: "Unable to review this question right now." },
      { status: 500 },
    );
  }
}
