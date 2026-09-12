import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { retrieveKnowledge, type KnowledgeMode } from "@/lib/knowledge-connectors";
import { cacheKnowledgeSources } from "@/lib/knowledge-rag";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODES: KnowledgeMode[] = ["teacher","student","nesa_exam_rev","developer","seller"];

async function requireAdminUser(req: NextRequest) {
  return requireAdmin(req.cookies.get("kivu_session")?.value);
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser(req);
    return NextResponse.json({ modes: MODES });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser(req);
    const body = await req.json() as { mode?: string; query?: string };
    const mode = MODES.includes(body.mode as KnowledgeMode)
      ? body.mode as KnowledgeMode
      : "student";
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (query.length < 3) {
      return NextResponse.json({ error: "Enter a topic, subject, book title, or search phrase." }, { status: 400 });
    }

    const sources = await retrieveKnowledge(mode, query);
    await cacheKnowledgeSources(mode, sources);

    return NextResponse.json({
      ok: true,
      mode,
      query,
      indexedSources: sources.length,
      sources: sources.map(source => ({
        title: source.title,
        provider: source.provider,
        url: source.url,
        chunks: source.excerpts?.length || 0,
      })),
    });
  } catch (error) {
    console.error("Knowledge indexing error:", error);
    const message = error instanceof Error ? error.message : "Unable to index knowledge right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
