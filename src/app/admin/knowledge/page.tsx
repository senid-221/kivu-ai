"use client";

import { useState } from "react";

const modes = [
  ["student", "Student"],
  ["teacher", "Teacher"],
  ["nesa_exam_rev", "NESA Exam Review"],
  ["developer", "Developer"],
  ["seller", "Seller"],
];

export default function KnowledgeAdminPage() {
  const [mode, setMode] = useState("student");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function indexKnowledge() {
    setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/knowledge/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, query }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Indexing failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Indexing failed");
    } finally { setLoading(false); }
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <h1>Knowledge Indexer</h1>
      <p>Add verified learning resources to the KIVU AI knowledge database.</p>

      <label>AI Mode</label>
      <select value={mode} onChange={e => setMode(e.target.value)} style={{ width: "100%", padding: 12, margin: "8px 0 16px" }}>
        {modes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>

      <label>Topic, subject, book, or search phrase</label>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Example: Senior 2 Biology photosynthesis" style={{ width: "100%", padding: 12, margin: "8px 0 16px" }} />

      <button onClick={indexKnowledge} disabled={loading || query.trim().length < 3} style={{ padding: "12px 18px" }}>
        {loading ? "Indexing knowledge..." : "Index Knowledge"}
      </button>

      {error && <p style={{ marginTop: 20 }}>{error}</p>}

      {result && (
        <section style={{ marginTop: 24 }}>
          <h2>Indexing complete</h2>
          <p>{result.indexedSources} source(s) processed for {result.mode}.</p>
          {result.sources.map((source: any) => (
            <article key={source.url} style={{ padding: 14, border: "1px solid #ddd", borderRadius: 10, marginTop: 10 }}>
              <strong>{source.title}</strong>
              <div>{source.provider}</div>
              <small>{source.chunks} indexed excerpt(s)</small>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
