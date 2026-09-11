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

  return (
    <main className="app">
      <header>
        <div>
          <b>✦ KIVU AI</b>
          <small>Student workspace</small>
        </div>
      </header>

      <section className="welcome">
        <span>KIVU STUDENT</span>
        <h1>Study in a way that helps you understand.</h1>
        <p>Learn actively, revise with confidence and practice at your own pace.</p>
      </section>

      <div className="studyModes">
        {modes.map((item) => (
          <button
            className={mode === item ? "selected" : ""}
            onClick={() => setMode(item)}
            key={item}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      <section className="studyBox">
        <h2>{mode}</h2>
        <input
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="What are you studying?"
        />
        <Link
          className="button"
          href={"/app/chat?model=student&prompt=" + encodeURIComponent(mode + ": " + topic)}
        >
          Start studying →
        </Link>
      </section>
    </main>
  );
}
