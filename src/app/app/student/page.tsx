"use client";

import Link from "next/link";
import { useState } from "react";

const modes = ["Kwiga", "Gusubiramo", "Kwimenyereza", "Umukoro"];
const modePrompts:Record<string,string> = {
  Kwiga: "Nyigisha iki gice mu buryo bworoshye",
  Gusubiramo: "Mfasha gusubiramo iri somo",
  Kwimenyereza: "Mpa imyitozo kuri",
  Umukoro: "Sobanura kandi umfasha gukemura uyu mukoro",
};

export default function Student() {
  const [mode, setMode] = useState(modes[0]);
  const [topic, setTopic] = useState("");
  const cleanTopic = topic.trim();
  const prompt = cleanTopic ? `${modePrompts[mode]}: ${cleanTopic}` : modePrompts[mode];

  return <main className="studentPage">
    <section className="studentIntro">
      <span className="studentEyebrow">EDUKA STUDENT • UMWIGA</span>
      <h1>Iga neza, usobanukirwe.</h1>
      <p>Learn, revise and practise at your own pace.</p>
    </section>
    <nav className="studentModes" aria-label="Hitamo uburyo bwo kwiga">
      {modes.map((item) => <button className={mode === item ? "studentMode active" : "studentMode"} onClick={() => setMode(item)} key={item} type="button">{item}</button>)}
    </nav>
    <section className="studentStudy">
      <label htmlFor="study-topic">{mode} hamwe na EDUKA</label>
      <p className="studentHelp">Write your topic clearly and EDUKA will help you step by step.</p>
      <div className="studentInputRow">
        <input id="study-topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Ni iki uri kwiga? / What are you studying?" />
        <Link className="studentStart" href={"/app/chat?model=student&prompt=" + encodeURIComponent(prompt)}>Tangira</Link>
      </div>
    </section>
  </main>;
}