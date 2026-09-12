import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { generateGemini } from "@/lib/gemini";
import { retrieveKnowledge, knowledgePrompt, evidenceSources } from "@/lib/knowledge-connectors";
import { cacheKnowledgeSources, searchIndexedKnowledge } from "@/lib/knowledge-rag";

async function uid(req: NextRequest) {
  const token = req.cookies.get("eduka_session")?.value;
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

    const query = [subject || "General", question, options || ""].filter(Boolean).join("\n");
    let sources = await searchIndexedKnowledge("nesa_exam_rev", query);
    if (sources.length < 3) {
      const freshSources = await retrieveKnowledge("nesa_exam_rev", query);
      if (freshSources.length) await cacheKnowledgeSources("nesa_exam_rev", freshSources);
      const known = new Set(sources.map((source) => source.url));
      sources = [...sources, ...freshSources.filter((source) => !known.has(source.url))].slice(0, 6);
    }

    const result = await generateGemini({
      systemInstruction:
        "You are EDUKA NESA EXAM REVIEW. Return ONLY valid JSON with correctAnswer, explanation, keyConcept and revisionTip. Use verified REB learning sources when they support the question. Never claim an official source was consulted unless it appears in the evidence. If evidence is insufficient, say so clearly in the explanation and give a careful educational answer.\n\n" +
        knowledgePrompt("nesa_exam_rev", sources, query),
      parts: [{ text: "Subject: " + (subject || "General") + "\nQuestion: " + question + "\nOptions: " + (options || "") }],
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

    return NextResponse.json({ id: review.id, ...reviewData, model: result.model, sources: evidenceSources(sources, query, "nesa_exam_rev").map((source) => ({ title: source.title, url: source.url, provider: source.provider, usedAsEvidence: true })) });
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
