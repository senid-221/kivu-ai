import { NextRequest, NextResponse } from "next/server";
import { generateGemini } from "@/lib/gemini";

type Review = {
  correctAnswer: string;
  explanation: string;
  keyConcept: string;
  revisionTip: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question =
      typeof body.question === "string" ? body.question.trim() : "";

    if (!question) {
      return NextResponse.json({ error: "Please provide a question." }, { status: 400 });
    }

    const result = await generateGemini({
      systemInstruction:
        "You are KIVU NESA EXAM REV. Return ONLY valid JSON with correctAnswer, explanation, keyConcept and revisionTip.",
      parts: [
        {
          text:
            "Subject: " +
            (body.subject || "General") +
            "\nQuestion: " +
            question +
            "\nOptions: " +
            (body.options || "None"),
        },
      ],
      temperature: 0.2,
      maxOutputTokens: 1800,
    });

    const clean = result.text
      .replace(/^\s*\`\`\`json\s*/i, "")
      .replace(/\`\`\`\s*$/, "");

    let review: Review;
    try {
      review = JSON.parse(clean);
    } catch {
      review = {
        correctAnswer: "See explanation",
        explanation: result.text,
        keyConcept: "Review the main concept.",
        revisionTip: "Practice similar questions.",
      };
    }

    return NextResponse.json({ ...review, model: result.model });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to review this question right now.",
      },
      { status: 500 }
    );
  }
}
