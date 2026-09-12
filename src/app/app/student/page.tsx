"use client";

import Link from "next/link";
import { useState } from "react";

const modes = [
  "Learn",
  "Revise",
  "Practice",
  "Homework",
];

const modePrompts:Record<string,string> = {
  Learn: "Teach me this topic clearly",
  Revise: "Help me revise this lesson",
  Practice: "Give me practice questions about",
  Homework: "Explain and help me solve this homework",
};

export default function Student() {
  const [mode, setMode] = useState(modes[0]);
  const [topic, setTopic] = useState("");

  const cleanTopic = topic.trim();
  const prompt = cleanTopic
    ? `${modePrompts[mode]}: ${cleanTopic}`
    : modePrompts[mode];

  return (
    <main className="studentPage">
      <section className="studentIntro">
        <span className="studentEyebrow">KIVU STUDENT</span>
        <h1>Study smarter.</h1>
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
        <label htmlFor="study-topic">{mode} with KIVU AI</label>
        <div className="studentInputRow">
          <input
            id="study-topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="What are you studying?"
          />
          <Link
            className="studentStart"
            href={"/app/chat?model=student&prompt=" + encodeURIComponent(prompt)}
          >
            Start
          </Link>
        </div>
      </section>
    </main>
  );
}