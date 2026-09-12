export type KnowledgeMode = "teacher" | "student" | "nesa_exam_rev" | "developer" | "seller";

export type KnowledgeSource = {
  title: string;
  url: string;
  snippet: string;
  provider: string;
};

type Provider = {
  name: string;
  hosts: string[];
  searchUrls: (q: string) => string[];
  match: RegExp;
};

const PROVIDERS: Record<KnowledgeMode, Provider[]> = {
  teacher: [
    { name: "REB E-Learning", hosts: ["elearning.reb.rw"], searchUrls: q => [
      "https://elearning.reb.rw/local/reblibrary/index.php?search=" + encodeURIComponent(q),
      "https://elearning.reb.rw/course/search.php?search=" + encodeURIComponent(q)
    ], match: /pluginfile\.php|resource|course\/view|reblibrary|mod\/folder|mod\/resource/i },
    { name: "OpenStax", hosts: ["openstax.org"], searchUrls: () => ["https://openstax.org/subjects"], match: /openstax\.org\//i }
  ],
  student: [
    { name: "REB E-Learning", hosts: ["elearning.reb.rw"], searchUrls: q => ["https://elearning.reb.rw/local/reblibrary/index.php?search=" + encodeURIComponent(q)], match: /pluginfile\.php|resource|course\/view|reblibrary|mod\/resource/i },
    { name: "OpenStax", hosts: ["openstax.org"], searchUrls: () => ["https://openstax.org/subjects"], match: /openstax\.org\//i }
  ],
  nesa_exam_rev: [
    { name: "REB E-Learning", hosts: ["elearning.reb.rw"], searchUrls: q => ["https://elearning.reb.rw/local/reblibrary/index.php?search=" + encodeURIComponent(q)], match: /pluginfile\.php|resource|course\/view|reblibrary|mod\/resource/i }
  ],
  developer: [
    { name: "MDN Web Docs", hosts: ["developer.mozilla.org"], searchUrls: q => ["https://developer.mozilla.org/en-US/search?q=" + encodeURIComponent(q)], match: /\/docs\//i },
    { name: "PostgreSQL Documentation", hosts: ["postgresql.org"], searchUrls: () => ["https://www.postgresql.org/docs/"], match: /\/docs\//i },
    { name: "React Documentation", hosts: ["react.dev"], searchUrls: () => ["https://react.dev/learn"], match: /react\.dev\//i },
    { name: "Next.js Documentation", hosts: ["nextjs.org"], searchUrls: () => ["https://nextjs.org/docs"], match: /nextjs\.org\/docs/i }
  ],
  seller: [
    { name: "HubSpot Academy", hosts: ["academy.hubspot.com"], searchUrls: q => ["https://academy.hubspot.com/courses?search=" + encodeURIComponent(q)], match: /academy\.hubspot\.com\//i },
    { name: "HubSpot Sales Training", hosts: ["hubspot.com"], searchUrls: () => ["https://www.hubspot.com/sales/sales-training"], match: /hubspot\.com\/sales/i }
  ]
};

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchProvider(provider: Provider, query: string): Promise<KnowledgeSource[]> {
  const results: KnowledgeSource[] = [];

  for (const searchUrl of provider.searchUrls(query)) {
    try {
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 KIVU-AI Knowledge Connector",
          Accept: "text/html,application/xhtml+xml"
        },
        cache: "no-store",
        signal: AbortSignal.timeout(7000)
      });
      if (!response.ok) continue;

      const html = await response.text();
      const links = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let match: RegExpExecArray | null;

      while ((match = links.exec(html)) && results.length < 4) {
        const title = stripHtml(match[2]);
        if (title.length < 4) continue;

        let url: string;
        try { url = new URL(match[1], searchUrl).toString(); } catch { continue; }
        const parsed = new URL(url);

        if (!provider.hosts.some(host => parsed.hostname === host || parsed.hostname.endsWith("." + host))) continue;
        if (!provider.match.test(url)) continue;
        if (results.some(item => item.url === url)) continue;

        results.push({
          title,
          url,
          snippet: "Official " + provider.name + " learning resource",
          provider: provider.name
        });
      }

      if (results.length) break;
    } catch {
      // A connector failing must never stop the AI chat.
    }
  }

  return results;
}

export async function retrieveKnowledge(mode: KnowledgeMode, query: string): Promise<KnowledgeSource[]> {
  const providers = PROVIDERS[mode] || [];
  const groups = await Promise.all(providers.map(provider => searchProvider(provider, query)));
  return groups.flat().slice(0, 8);
}

export function knowledgePrompt(mode: KnowledgeMode, sources: KnowledgeSource[]) {
  if (!sources.length) {
    return "No verified external source was retrieved. Answer honestly from your model knowledge and do not pretend that a book or website was consulted.";
  }

  return [
    "KNOWLEDGE CONNECTOR MODE: " + mode,
    "VERIFIED LEARNING SOURCES:",
    ...sources.map((s, i) => (i + 1) + ". " + s.title + "\nProvider: " + s.provider + "\nURL: " + s.url + "\n" + s.snippet),
    "",
    "Use these sources as preferred references when relevant. Do not claim to quote or have read content that was not actually retrieved. Do not fabricate citations. Give a concise Sources section with the source titles and URLs used."
  ].join("\n");
}
