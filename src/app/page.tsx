import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <nav>
        <b>✦ Eduka</b>
        <div>
          <Link href="/login">Sign in</Link>
          <Link className="button" href="/signup">Get started</Link>
        </div>
      </nav>

      <section>
        <span>✦ Your intelligent learning companion</span>
        <h1>Learn. Build.<br /><em>Grow.</em></h1>
        <p>
          Eduka helps students, teachers, developers and entrepreneurs learn
          from trusted knowledge sources and grow their skills.
        </p>
        <Link className="button" href="/signup">Start learning with Eduka →</Link>
      </section>
    </main>
  );
}