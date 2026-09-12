import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function Home() {
  return (
    <main className="landing">
      <nav>
        <b className="landingBrand"><GraduationCap size={22} /> Eduka</b>
        <div>
          <Link href="/login">Sign in</Link>
          <Link className="button" href="/signup">Get started</Link>
        </div>
      </nav>

      <section>
        <span className="landingEyebrow"><GraduationCap size={18} /> Your intelligent learning companion</span>
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