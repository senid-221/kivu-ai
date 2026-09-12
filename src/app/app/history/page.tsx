"use client";
import Link from "next/link";
import { ArrowRight, History as HistoryIcon, MessageSquarePlus } from "lucide-react";
import {useEffect,useState} from "react";

export default function History(){
 const[items,setItems]=useState<any[]>([]);
 useEffect(()=>{fetch("/api/conversations").then(r=>r.json()).then(d=>setItems(d.items||[])).catch(()=>setItems([]))},[]);
 return <main className="historyPage">
  <header className="historyTop"><div><p className="agentEyebrow">CONVERSATIONS</p><h1>Chat history</h1><p>Continue your previous conversations with KIVU AI.</p></div><Link className="historyNew" href="/app/chat"><MessageSquarePlus size={16}/> New chat</Link></header>
  <section className="historyList">{items.length?items.map(x=><Link className="historyCard" key={x.id} href={`/app/chat?model=${encodeURIComponent(x.model||"teacher")}&conversation=${encodeURIComponent(x.id)}`}><span className="historyCardIcon"><HistoryIcon size={18}/></span><span className="historyCardText"><b>{x.title||"Untitled conversation"}</b><small>{x.model||"KIVU AI"} · {new Date(x.updatedAt).toLocaleDateString()}</small></span><ArrowRight className="historyArrow" size={18}/></Link>):<div className="historyEmpty"><HistoryIcon size={28}/><h2>No conversations yet</h2><p>Start a new conversation and it will appear here.</p><Link className="historyNew" href="/app/chat">Start chatting</Link></div>}</section>
 </main>
}