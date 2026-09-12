import { NextRequest, NextResponse } from "next/server";
import { generateGemini } from "@/lib/gemini";
import { retrieveKnowledge, knowledgePrompt, evidenceSources } from "@/lib/knowledge-connectors";
import { cacheKnowledgeSources, searchIndexedKnowledge } from "@/lib/knowledge-rag";

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

    const query = [body.subject || "General", question, body.options || ""].filter(Boolean).join("\n");
    let sources = await searchIndexedKnowledge("nesa_exam_rev", query);
    if (sources.length < 3) {
      const freshSources = await retrieveKnowledge("nesa_exam_rev", query);
      if (freshSources.length) await cacheKnowledgeSources("nesa_exam_rev", freshSources);
      const known = new Set(sources.map((source) => source.url));
      sources = [...sources, ...freshSources.filter((source) => !known.has(source.url))].slice(0, 6);
    }

    const result = await generateGemini({
      systemInstruction:
        "You are EDUKA NESA EXAM REVIEW. Return ONLY valid JSON with correctAnswer, explanation, keyConcept and revisionTip. Use verified REB learning sources when they support the question. Never invent an official source, quotation, page number, or citation. If source evidence is insufficient, make that clear in the explanation.\n\n" +
        knowledgePrompt("nesa_exam_rev", sources, query),
      parts: [{ text: "Subject: " + (body.subject || "General") + "\nQuestion: " + question + "\nOptions: " + (body.options || "None") }],
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

    return NextResponse.json({ ...review, model: result.model, sources: evidenceSources(sources, query, "nesa_exam_rev").map((source) => ({ title: source.title, url: source.url, provider: source.provider, usedAsEvidence: true })) });
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
