import Link from "next/link";
export default function AppLayout({children}:{children:React.ReactNode}){
 const nav=[["⌂","Home","/app"],["💬","Chat","/app/chat?model=teacher"],["📈","Progress","/app/progress"],["📚","Materials","/app/upload"]];
 const specialists=[["👩🏾‍🏫","Teacher","/app/teacher"],["💻","Developer","/app/developer"],["🎓","Student","/app/student"],["💼","Seller","/app/seller"],["📝","NESA Exam","/app/nesa"]];
 return <div className="kivuApp">
   <aside className="appSidebar">
    <Link className="appBrand" href="/app">✦ <span>KIVU AI</span></Link>
    <div className="navLabel">WORKSPACE</div>
    <nav>{nav.map(x=><Link href={x[2]} key={x[1]}><span>{x[0]}</span>{x[1]}</Link>)}</nav>
    <div className="navLabel specialistLabel">SPECIALIZED AI</div>
    <nav>{specialists.map(x=><Link href={x[2]} key={x[1]}><span>{x[0]}</span>{x[1]}</Link>)}</nav>
   </aside>
   <header className="mobileAppHeader"><Link href="/app">✦ KIVU AI</Link><Link href="/app/profile" aria-label="Profile">◉</Link></header>
   <div className="appContent">{children}</div>
   <nav className="bottomNav">{nav.map(x=><Link href={x[2]} key={x[1]}><span>{x[0]}</span><small>{x[1]}</small></Link>)}</nav>
 </div>
}