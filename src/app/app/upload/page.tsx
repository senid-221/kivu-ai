"use client";

import { useEffect, useState } from "react";

type Material = { id: string; name: string; type: string; size: number };
type Flashcard = { front: string; back: string };
type QuizQuestion = { question: string; options: string[]; answer: number; explanation: string };

export default function Materials() {
  const [items, setItems] = useState<Material[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [card, setCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);

  async function load() {
    const response = await fetch("/api/materials");
    const data = await response.json();
    setItems(Array.isArray(data.items) ? data.items : []);
  }

  useEffect(() => {
    void load();
  }, []);

  function parseJson<T>(value: string): T {
    const clean = value.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as T;
  }

  async function analyze(id: string, action: string) {
    setBusy(true);
    setError("");
    setResult("");
    setCards([]);
    setQuiz([]);
    setSubmitted(false);

    try {
      const response = await fetch("/api/materials/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to analyze this material.");

      if (action === "flashcards") {
        setCards(parseJson<Flashcard[]>(data.result));
        setCard(0);
      } else if (action === "quiz") {
        setQuiz(parseJson<QuizQuestion[]>(data.result));
        setAnswers([]);
      } else {
        setResult(String(data.result || ""));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze this material.");
    } finally {
      setBusy(false);
    }
  }

  async function add(file: File) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
      });
      const data = await response.json();
      if (!response.ok || !data.uploadUrl) throw new Error(data.error || "Unable to prepare upload.");

      const upload = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!upload.ok) throw new Error("Upload failed.");

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const score = quiz.reduce(
    (total, question, index) => total + (answers[index] === question.answer ? 1 : 0),
    0,
  );

  return (
    <main className="app">
      <header>
        <div>
          <b>✦ KIVU AI</b>
          <small>Interactive learning</small>
        </div>
      </header>

      <section className="welcome">
        <span>YOUR MATERIALS</span>
        <h1>Learn actively. Remember longer.</h1>
      </section>

      <label className="dropzone">
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void add(file);
          }}
        />
        <b>{busy ? "KIVU is working..." : "＋ Upload a material"}</b>
        <small>PDF, Word and text files</small>
      </label>

      {error && <p className="formError">{error}</p>}

      <section className="history">
        {items.map((item) => (
          <div className="historyItem" key={item.id}>
            <b>📄 {item.name}</b>
            <div className="materialActions">
              {[
                ["summary", "Summary"],
                ["notes", "Notes"],
                ["flashcards", "Flashcards"],
                ["quiz", "Interactive Quiz"],
                ["plan", "Revision plan"],
              ].map(([action, label]) => (
                <button key={action} type="button" onClick={() => void analyze(item.id, action)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {cards.length > 0 && (
        <section className="studyBox interactive">
          <span>FLASHCARD {card + 1} / {cards.length}</span>
          <button className={`flashcard ${flipped ? "flipped" : ""}`} type="button" onClick={() => setFlipped((value) => !value)}>
            <span>{flipped ? cards[card]?.back : cards[card]?.front}</span>
            <small>Tap to flip</small>
          </button>
          <div className="studyControls">
            <button type="button" onClick={() => { setCard(Math.max(0, card - 1)); setFlipped(false); }} disabled={card === 0}>Previous</button>
            <button type="button" onClick={() => { setCard(Math.min(cards.length - 1, card + 1)); setFlipped(false); }} disabled={card === cards.length - 1}>Next</button>
          </div>
        </section>
      )}

      {quiz.length > 0 && (
        <section className="studyBox quizBox">
          {quiz.map((question, index) => (
            <div className="quizQuestion" key={`${question.question}-${index}`}>
              <b>{index + 1}. {question.question}</b>
              {question.options.map((option, optionIndex) => (
                <label key={`${option}-${optionIndex}`}>
                  <input
                    type="radio"
                    name={`q${index}`}
                    disabled={submitted}
                    checked={answers[index] === optionIndex}
                    onChange={() => setAnswers((current) => {
                      const next = [...current];
                      next[index] = optionIndex;
                      return next;
                    })}
                  /> {option}
                </label>
              ))}
              {submitted && (
                <small>
                  {answers[index] === question.answer ? "✓ Correct" : `Correct answer: ${question.options[question.answer]}`} — {question.explanation}
                </small>
              )}
            </div>
          ))}
          {!submitted ? (
            <button className="button" type="button" onClick={() => setSubmitted(true)}>Finish quiz</button>
          ) : (
            <h3>Your score: {score}/{quiz.length}</h3>
          )}
        </section>
      )}

      {result && (
        <section className="studyBox">
          <b>✦ KIVU DOCUMENT INTELLIGENCE</b>
          <pre style={{ whiteSpace: "pre-wrap" }}>{result}</pre>
        </section>
      )}
    </main>
  );
}
