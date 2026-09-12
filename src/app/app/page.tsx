import Link from "next/link";

export default function Workspace(){
 return <main className="dashboard">
  <header className="dashboardTop">
   <div>
    <span>WELCOME TO KIVU AI</span>
    <h1>Your AI workspace.</h1>
    <p>Everything is now available in one smart chat. Choose the AI model you need directly inside Chat.</p>
   </div>
   <Link className="progressLink" href="/app/progress">My Progress →</Link>
  </header>

  <section className="hero">
   <div>
    <span>✦ ONE CHAT · MANY AI MODELS</span>
    <h2>Ask. Learn.<br/><em>Build.</em></h2>
    <p>Use one simple KIVU AI chat for learning, development, business and NESA exam preparation.</p>
    <div className="heroActions">
     <Link href="/app/chat">Open KIVU Chat →</Link>
     <Link href="/app/chat">Choose a model</Link>
    </div>
   </div>
   <div className="heroOrb">✦</div>
  </section>

  <section className="studyBox">
   <div className="sectionHead">
    <span>HOW IT WORKS</span>
    <h2>One chat, all your AI tools</h2>
   </div>
   <p>Select a model from the dropdown in Chat, write your question, and continue your conversation in one place.</p>
   <Link className="textAction" href="/app/chat">Go to Chat →</Link>
  </section>
 </main>
}