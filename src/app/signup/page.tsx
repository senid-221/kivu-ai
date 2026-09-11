"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

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

    router.push("/app");
  }

  return (
    <main className="authPage">
      <form onSubmit={submit} className="authCard">
        <Link href="/" className="brand">✦ KIVU AI</Link>
        <h1>Create your account</h1>
        <p>Start learning, building and growing with KIVU.</p>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
        />

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          minLength={8}
          required
        />

        {error && <small className="formError">{error}</small>}

        <button className="button" type="submit">Create account</button>

        <p>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
