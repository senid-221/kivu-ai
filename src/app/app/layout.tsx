import Link from "next/link";
import { GraduationCap, History, LayoutDashboard, MessageSquarePlus, UserRound, BarChart3 } from "lucide-react";

export default function AppLayout({children}:{children:React.ReactNode}){
 const nav=[
  {icon:<MessageSquarePlus size={18}/>,label:"New chat",href:"/app/chat"},
  {icon:<History size={18}/>,label:"History",href:"/app/history"},
  {icon:<BarChart3 size={18}/>,label:"Progress",href:"/app/progress"},
 ];
 return <div className="edukaApp agentShell">
   <aside className="appSidebar agentSidebar">
    <Link className="appBrand agentSideBrand" href="/app"><span className="brandCube"><GraduationCap size={18}/></span><span>EDUKA</span></Link>
    <Link className="agentNewChat" href="/app/chat"><MessageSquarePlus size={17}/> New chat</Link>
    <div className="navLabel">WORKSPACE</div>
    <nav>{nav.slice(1).map(x=><Link href={x.href} key={x.label}><span>{x.icon}</span>{x.label}</Link>)}</nav>
    <div className="agentSideSpacer" />
    <div className="navLabel">ACCOUNT</div>
    <nav className="agentAccountNav">
      <Link href="/app"><span><LayoutDashboard size={18}/></span>Dashboard</Link>
      <Link href="/app/profile"><span><UserRound size={18}/></span>Profile</Link>
    </nav>
    <div className="agentSidebarFooter"><span className="agentStatusDot"/> AI systems ready</div>
   </aside>
   <header className="mobileAppHeader">
    <Link href="/app/chat" className="mobileAgentBrand"><span className="brandCube"><GraduationCap size={16}/></span> EDUKA</Link>
    <Link href="/app/history" aria-label="Conversation history"><History size={20}/></Link>
   </header>
   <div className="appContent">{children}</div>
   <nav className="bottomNav">
    <Link href="/app/chat"><MessageSquarePlus size={19}/><small>Chat</small></Link>
    <Link href="/app/history"><History size={19}/><small>History</small></Link>
    <Link href="/app/profile"><UserRound size={19}/><small>Profile</small></Link>
   </nav>
 </div>
}