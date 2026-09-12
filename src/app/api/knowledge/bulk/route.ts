import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { retrieveKnowledge, type KnowledgeMode } from "@/lib/knowledge-connectors";
import { cacheKnowledgeSources } from "@/lib/knowledge-rag";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUBJECTS = [
  "Mathematics", "Biology", "Chemistry", "Physics",
  "English", "Kinyarwanda", "History", "Geography",
  "Computer Science", "Economics", "Entrepreneurship"
];

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req.cookies.get("eduka_session")?.value);
    const body = await req.json() as { mode?: KnowledgeMode; subjects?: string[]; level?: string };
    const mode = body.mode || "student";
    const selected = (body.subjects?.length ? body.subjects : SUBJECTS).filter(s => SUBJECTS.includes(s));
    const level = body.level?.trim() || "Rwanda secondary school";

    const results = [];
    for (const subject of selected) {
      const query = level + " " + subject + " textbook learning material";
      const sources = await retrieveKnowledge(mode, query);
      await cacheKnowledgeSources(mode, sources);
      results.push({ subject, sources: sources.length });
    }

    return NextResponse.json({ ok: true, mode, level, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk indexing failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
