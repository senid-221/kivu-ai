import { NextRequest, NextResponse } from "next/server";
import { generateGemini } from "@/lib/gemini";
import { retrieveKnowledge, knowledgePrompt } from "@/lib/knowledge-connectors";
import { cacheKnowledgeSources, searchIndexedKnowledge } from "@/lib/knowledge-rag";

type PracticeQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const level = typeof body.level === "string" ? body.level.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const count = Math.min(Math.max(Number(body.count) || 5, 1), 10);

    if (!level || !subject) {
      return NextResponse.json({ error: "Please provide level and subject." }, { status: 400 });
    }

    const query = [level, subject, topic, "NESA past paper exam questions marking guide"].filter(Boolean).join("\n");

    let sources = await searchIndexedKnowledge("nesa_exam_rev", query);
    if (sources.length < 3) {
      const fresh = await retrieveKnowledge("nesa_exam_rev", query);
      if (fresh.length) await cacheKnowledgeSources("nesa_exam_rev", fresh);
      const known = new Set(sources.map((source) => source.url));
      sources = [...sources, ...fresh.filter((source) => !known.has(source.url))].slice(0, 6);
    }

    const result = await generateGemini({
      systemInstruction:
        "You are EDUKA NESA PRACTICE. Return ONLY valid JSON with a questions array. Each item must contain question, options (exactly four strings), answer, and explanation. Create practice questions from retrieved exam evidence when available. Do not claim generated questions are verbatim official past-paper questions unless the retrieved evidence explicitly contains that exact question. Keep level and subject appropriate.\n\n" +
        knowledgePrompt("nesa_exam_rev", sources),
      parts: [{ text: "Level: " + level + "\nSubject: " + subject + "\nTopic: " + (topic || "Mixed revision") + "\nNumber of questions: " + count }],
      temperature: 0.3,
      maxOutputTokens: 5000,
    });

    const clean = result.text.replace(/^\s*\`\`\`json\s*/i, "").replace(/\`\`\`\s*$/, "");
    let questions: PracticeQuestion[] = [];
    try {
      const parsed = JSON.parse(clean);
      questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    } catch {
      return NextResponse.json({ error: "Unable to generate a valid practice set." }, { status: 502 });
    }

    return NextResponse.json({
      level,
      subject,
      topic: topic || null,
      questions,
      model: result.model,
      sources: sources.map((source) => ({
        title: source.title,
        url: source.url,
        provider: source.provider,
        usedAsEvidence: Boolean(source.excerpts?.length),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create practice questions." },
      { status: 500 }
    );
  }
}
