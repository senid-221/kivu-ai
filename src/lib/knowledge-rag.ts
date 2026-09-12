import { PrismaClient } from "@prisma/client";
import type { KnowledgeMode, KnowledgeSource } from "@/lib/knowledge-connectors";

const globalForPrisma = globalThis as unknown as { kivuPrisma?: PrismaClient };
export const kivuPrisma = globalForPrisma.kivuPrisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.kivuPrisma = kivuPrisma;

function terms(query: string) {
  return Array.from(new Set(query.toLowerCase().split(/[^a-z0-9À-ÿ]+/i).filter(x => x.length >= 3))).slice(0, 16);
}

function score(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.reduce((n, word) => n + (lower.includes(word) ? 1 : 0), 0);
}

export async function cacheKnowledgeSources(mode: KnowledgeMode, sources: KnowledgeSource[]) {
  for (const source of sources) {
    if (!source.excerpts?.length) continue;
    const doc = await kivuPrisma.knowledgeDocument.upsert({
      where: { url: source.url },
      create: { mode, provider: source.provider, title: source.title, url: source.url },
      update: { mode, provider: source.provider, title: source.title },
    });

    await kivuPrisma.knowledgeChunk.deleteMany({ where: { documentId: doc.id } });
    await kivuPrisma.knowledgeChunk.createMany({
      data: source.excerpts.map((content, chunkIndex) => ({ documentId: doc.id, chunkIndex, content })),
    });
  }
}

export async function searchIndexedKnowledge(mode: KnowledgeMode, query: string): Promise<KnowledgeSource[]> {
  const words = terms(query);
  if (!words.length) return [];

  const chunks = await kivuPrisma.knowledgeChunk.findMany({
    where: { document: { mode } },
    include: { document: true },
    take: 300,
  });

  const ranked = chunks
    .map(chunk => ({ chunk, score: score(chunk.content, words) }))
    .filter(item => item.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0, 12);

  const grouped = new Map<string, KnowledgeSource>();
  for (const item of ranked) {
    const key = item.chunk.document.url;
    const existing = grouped.get(key);
    if (existing) {
      existing.excerpts = [...(existing.excerpts || []), item.chunk.content];
    } else {
      grouped.set(key, {
        title: item.chunk.document.title,
        url: item.chunk.document.url,
        snippet: "Indexed knowledge source",
        provider: item.chunk.document.provider,
        excerpts: [item.chunk.content],
      });
    }
  }
  return Array.from(grouped.values()).slice(0, 6);
}
