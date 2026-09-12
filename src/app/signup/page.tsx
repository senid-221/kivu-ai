"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to create your account.");
        return;
      }
      router.replace("/app/chat");
      router.refresh();
    } catch {
      setError("Unable to connect right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="edukaAuth">
      <section className="edukaAuthVisual">
        <Link href="/" className="edukaLogo"><span>✦</span> EDUKA</Link>
        <div className="edukaVisualCopy">
          <span className="edukaEyebrow">LEARNING FOR EVERYONE</span>
          <h2>Build your future through <em>AI.</em></h2>
          <p>Learn, create, revise and grow with intelligent tools designed around you.</p>
          <div className="edukaFeatureList">
            <div><b>✦</b><span><strong>Learn faster</strong><small>Study with your personal AI teacher</small></span></div>
            <div><b>◈</b><span><strong>Create smarter</strong><small>Build websites, apps and systems</small></span></div>
            <div><b>✓</b><span><strong>Achieve more</strong><small>Track progress and improve every day</small></span></div>
          </div>
        </div>
        <p className="edukaCopyright">© 2026 EDUKA</p>
      </section>

      <section className="edukaAuthPanel">
        <div className="edukaAuthInner">
          <div className="edukaMobileLogo">✦ EDUKA</div>
          <span className="edukaEyebrow">CREATE YOUR ACCOUNT</span>
          <h1>Welcome to EDUKA</h1>
          <p className="edukaLead">Create your account and start exploring what you can do.</p>

          <form onSubmit={submit} className="edukaForm">
            <label>
              <span>Full name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your name" autoComplete="name" />
            </label>
            <label>
              <span>Email address</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </label>
            <label>
              <span>Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required />
            </label>

            {error && <div className="edukaFormError">{error}</div>}

            <button className="edukaPrimaryButton" type="submit" disabled={loading}>
              {loading ? "Creating your account..." : "Create account"} <span>→</span>
            </button>
          </form>

          <p className="edukaSwitch">Already have an account? <Link href="/login">Sign in</Link></p>
        </div>
      </section>
    </main>
  );
}
