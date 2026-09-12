import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { generateGemini } from "@/lib/gemini";

async function uid(req: NextRequest) {
  const token = req.cookies.get("kivu_session")?.value;
  if (!token) throw new Error("Unauthorized");
  return readSession(token);
}

function parseReview(raw: string) {
  const clean = raw
    .replace(/^\s*\`\`\`json\s*/i, "")
    .replace(/\`\`\`\s*$/, "");

  try {
    return JSON.parse(clean);
  } catch {
    return {
      correctAnswer: "See explanation",
      explanation: raw,
      keyConcept: "Review the main concept.",
      revisionTip: "Practice similar questions.",
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await uid(req);
    const { subject, question, options } = await req.json();

    if (!question?.trim()) {
      return NextResponse.json({ error: "Enter an exam question." }, { status: 400 });
    }

    const result = await generateGemini({
      systemInstruction:
        "You are KIVU AI NESA EXAM REV. Return ONLY valid JSON with correctAnswer, explanation, keyConcept and revisionTip. Be accurate and educational.",
      parts: [
        {
          text:
            "Subject: " +
            (subject || "General") +
            "\nQuestion: " +
            question +
            "\nOptions: " +
            (options || ""),
        },
      ],
      temperature: 0.2,
      maxOutputTokens: 1800,
    });

    const reviewData = parseReview(result.text);
    const review = await prisma.examReview.create({
      data: {
        subject: subject || null,
        question,
        options: options || null,
        correctAnswer: reviewData.correctAnswer || null,
        explanation: reviewData.explanation || null,
        keyConcept: reviewData.keyConcept || null,
        revisionTip: reviewData.revisionTip || null,
        userId,
      },
    });

    return NextResponse.json({ id: review.id, ...reviewData, model: result.model });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to review this exam question.";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await uid(req);
    const reviews = await prisma.examReview.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(reviews);
  } catch {
    return NextResponse.json([]);
  }
}
