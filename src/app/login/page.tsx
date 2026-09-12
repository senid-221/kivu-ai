"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to sign in.");
      return;
    }

    router.replace("/app/chat");
  }

  return (
    <main className="authPage">
      <form onSubmit={submit} className="authCard">
        <Link href="/" className="brand">✦ EDUKA</Link>
        <h1>Welcome back</h1>
        <p>Continue your Eduka journey.</p>

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
          required
        />

        {error && <small className="formError">{error}</small>}

        <button className="button" type="submit">Sign in</button>

        <p>
          New to Eduka? <Link href="/signup">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
