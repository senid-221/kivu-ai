export type RebSource = {
  title: string;
  url: string;
  snippet: string;
};

/**
 * Retrieves public pages from the official REB e-Learning domain.
 * The library is treated as a source layer: only public resources returned
 * from elearning.reb.rw are passed to Gemini.
 */
export async function searchRebLibrary(query: string): Promise<RebSource[]> {
  const q = query.trim();
  if (!q) return [];

  const candidates = [
    `https://elearning.reb.rw/local/reblibrary/index.php?search=${encodeURIComponent(q)}`,
    `https://elearning.reb.rw/course/search.php?search=${encodeURIComponent(q)}`,
  ];

  const found: RebSource[] = [];

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 KIVU-AI Educational Research",
          Accept: "text/html,application/xhtml+xml",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) continue;
      const html = await response.text();

      // Extract links and surrounding visible labels from the official domain.
      const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let match: RegExpExecArray | null;
      while ((match = linkPattern.exec(html)) && found.length < 8) {
        const href = match[1];
        const title = match[2]
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (!title || title.length < 3) continue;

        const absolute = new URL(href, url).toString();
        const parsed = new URL(absolute);
        if (parsed.hostname !== "elearning.reb.rw") continue;

        if (
          !/pluginfile\.php|resource|course\/view|reblibrary|mod\/folder|mod\/resource/i.test(
            absolute
          )
        ) continue;

        if (!found.some((item) => item.url === absolute)) {
          found.push({
            title,
            url: absolute,
            snippet: "Official REB e-Learning resource",
          });
        }
      }
    } catch {
      // The REB source is optional; normal Gemini answering still works.
    }

    if (found.length) break;
  }

  return found.slice(0, 6);
}

export function rebSourcesPrompt(sources: RebSource[]) {
  if (!sources.length) return "";

  return [
    "OFFICIAL REB E-LEARNING SOURCES FOUND:",
    ...sources.map(
      (source, index) =>
        `${index + 1}. ${source.title}\nSource: ${source.url}\n${source.snippet}`
    ),
    "",
    "Use these official REB sources as the preferred basis when they are relevant. Do not invent facts that are not supported by the retrieved source information. Clearly say when no sufficient REB source was found.",
  ].join("\n");
}
