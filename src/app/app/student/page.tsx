"use client";

import Link from "next/link";
import { useState } from "react";

const modes = [
  "Learn a topic",
  "Revise a lesson",
  "Practice questions",
  "Explain homework",
];

export default function Student() {
  const [mode, setMode] = useState(modes[0]);
  const [topic, setTopic] = useState("");

  const prompt = topic.trim()
    ? `${mode}: ${topic.trim()}`
    : mode;

  return (
    <main className="studentPage">
      <section className="studentIntro">
        <span className="studentEyebrow">KIVU STUDENT</span>
        <h1>Study in a way that helps you understand.</h1>
        <p>Learn, revise and practice at your own pace.</p>
      </section>

      <nav className="studentModes" aria-label="Choose study mode">
        {modes.map((item) => (
          <button
            className={mode === item ? "studentMode active" : "studentMode"}
            onClick={() => setMode(item)}
            key={item}
            type="button"
          >
            {item}
          </button>
        ))}
      </nav>

      <section className="studentStudy">
        <h2>{mode}</h2>
        <p className="studentHelp">Tell KIVU AI what you want to study.</p>

        <div className="studentInputRow">
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="What are you studying?"
            aria-label="What are you studying?"
          />
          <Link
            className="studentStart"
            href={"/app/chat?model=student&prompt=" + encodeURIComponent(prompt)}
          >
            Start →
          </Link>
        </div>
      </section>
    </main>
  );
}
