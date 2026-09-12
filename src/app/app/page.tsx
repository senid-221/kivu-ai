import Link from "next/link";
const models=[
 ["👩🏾‍🏫","Teacher","/app/teacher","Learn with clear lessons"],
 ["💻","Developer","/app/developer","Build websites and digital products"],
 ["🎓","Student","/app/student","Revise, practice and understand"],
 ["💼","Seller","/app/seller","Grow your business and sales"],
 ["📝","NESA Exam","/app/nesa","Prepare for examinations"]
];
export default function Workspace(){return <main className="dashboard">
 <header className="dashboardTop"><div><span>WELCOME TO KIVU AI</span><h1>Your AI workspace.</h1><p>Choose an expert and start learning, building or growing.</p></div><Link className="progressLink" href="/app/progress">My Progress →</Link></header>
 <section className="hero"><div><span>✦ ONE PLATFORM · MANY EXPERTS</span><h2>Learn. Build.<br/><em>Grow.</em></h2><p>KIVU AI gives you specialized intelligence for every important task.</p><div className="heroActions"><Link href="/app/chat?model=teacher">Start with AI →</Link><Link href="/app/student">Practice questions</Link></div></div><div className="heroOrb">✦</div></section>
 <section><div className="sectionHead"><span>WORKSPACES</span><h2>Choose your specialized AI</h2></div><div className="modelGrid">{models.map(x=><Link href={x[2]} className="modelCard" key={x[1]}><div className="modelIcon">{x[0]}</div><h3>{x[1]}</h3><p>{x[3]}</p><b>Open workspace →</b></Link>)}</div></section>
 </main>}