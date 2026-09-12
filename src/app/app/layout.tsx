import Link from "next/link";

export default function AppLayout({children}:{children:React.ReactNode}){
 const nav=[
  ["⌂","Home","/app"],
  ["💬","Chat","/app/chat"],
  ["📈","Progress","/app/progress"],
  ["📚","Materials","/app/upload"],
  ["◉","Profile","/app/profile"]
 ];
 const mobileNav=[
  ["⌂","Home","/app"],
  ["💬","Chat","/app/chat"],
  ["📚","Materials","/app/upload"],
  ["◉","Profile","/app/profile"]
 ];
 return <div className="kivuApp">
   <aside className="appSidebar">
    <Link className="appBrand" href="/app">✦ <span>KIVU AI</span></Link>
    <div className="navLabel">WORKSPACE</div>
    <nav>{nav.map(x=><Link href={x[2]} key={x[1]}><span>{x[0]}</span>{x[1]}</Link>)}</nav>
   </aside>
   <header className="mobileAppHeader">
    <Link href="/app">✦ KIVU AI</Link>
    <Link href="/app/chat" aria-label="Open Chat">💬 Chat</Link>
   </header>
   <div className="appContent">{children}</div>
   <nav className="bottomNav">{mobileNav.map(x=><Link href={x[2]} key={x[1]}><span>{x[0]}</span><small>{x[1]}</small></Link>)}</nav>
 </div>
}