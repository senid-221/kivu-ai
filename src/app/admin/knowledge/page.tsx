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
  const [bulkLoading, setBulkLoading] = useState(false);
  const [subjects, setSubjects] = useState(["Mathematics","Biology","Chemistry","Physics"]);
  const [level, setLevel] = useState("Rwanda secondary school");

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

  async function bulkIndex() {
    setBulkLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/knowledge/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, subjects, level }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Bulk indexing failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk indexing failed");
    } finally { setBulkLoading(false); }
  }

  const allSubjects = ["Mathematics","Biology","Chemistry","Physics","English","Kinyarwanda","History","Geography","Computer Science","Economics","Entrepreneurship"];

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

      <section style={{ marginTop: 36, paddingTop: 20, borderTop: "1px solid #ddd" }}>
        <h2>Bulk Subject Indexing</h2>
        <p>Select subjects to prepare the knowledge base before students ask questions.</p>
        <input value={level} onChange={e => setLevel(e.target.value)} placeholder="Education level" style={{ width: "100%", padding: 12, marginBottom: 12 }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {allSubjects.map(subject => (
            <label key={subject} style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}>
              <input type="checkbox" checked={subjects.includes(subject)} onChange={() => setSubjects(current => current.includes(subject) ? current.filter(x => x !== subject) : [...current, subject])} /> {subject}
            </label>
          ))}
        </div>
        <button onClick={bulkIndex} disabled={bulkLoading || subjects.length === 0} style={{ padding: "12px 18px" }}>
          {bulkLoading ? "Indexing subjects..." : "Bulk Index Selected Subjects"}
        </button>
      </section>

      {error && <p style={{ marginTop: 20 }}>{error}</p>}

      {result && (
        <section style={{ marginTop: 24 }}>
          <h2>Indexing complete</h2>
          {typeof result.indexedSources === "number" ? <p>{result.indexedSources} source(s) processed for {result.mode}.</p> : <p>{result.results?.reduce((n: number, item: any) => n + item.sources, 0) || 0} source(s) processed.</p>}
          {(result.sources || result.results || []).map((source: any) => (
            <article key={source.url} style={{ padding: 14, border: "1px solid #ddd", borderRadius: 10, marginTop: 10 }}>
              <strong>{source.title || source.subject}</strong>
              <div>{source.provider}</div>
              <small>{source.chunks} indexed excerpt(s)</small>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
