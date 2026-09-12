"use client";
import {useSearchParams,useRouter} from "next/navigation";
import {Suspense,useEffect,useState} from "react";
const models:any={
 teacher:{name:"Teacher",subtitle:"Learn with clear explanations and practical guidance",greeting:"What would you like to learn today?"},
 developer:{name:"Developer",subtitle:"Build websites, apps, systems and digital products",greeting:"What would you like to build?"},
 student:{name:"Student",subtitle:"Study, revise and understand lessons deeply",greeting:"What are we studying today?"},
 seller:{name:"Seller",subtitle:"Practical strategy for business, sales and growth",greeting:"What would you like to improve in your business?"},
 nesa_exam_rev:{name:"NESA EXAM Rev",subtitle:"Review examination questions with detailed explanations",greeting:"Paste an examination question to begin reviewing."}
};
function ChatContent(){
 const q=useSearchParams(),router=useRouter();const initial=q.get("model")||"teacher";
 const [modelId,setModelId]=useState(initial),[messages,setMessages]=useState<any[]>([]),[input,setInput]=useState(""),[loading,setLoading]=useState(false),[conversationId,setConversationId]=useState(q.get("conversation")||"");
 const model=models[modelId]||models.teacher;
 useEffect(()=>{setModelId(q.get("model")||"teacher")},[q]);
 function changeModel(id:string){setModelId(id);setMessages([]);setConversationId("");router.replace("/app/chat?model="+id)}
 async function persist(next:any[]){const r=await fetch("/api/conversations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:conversationId||undefined,title:next.find(x=>x.role==="user")?.content?.slice(0,60)||model.name,model:modelId,messages:next})});const d=await r.json();if(r.ok&&d.item&&!conversationId){setConversationId(d.item.id);router.replace("/app/chat?model="+modelId+"&conversation="+d.item.id)}}
 async function send(){const text=input.trim();if(!text||loading)return;const next=[...messages,{role:"user",content:text}];setMessages(next);setInput("");setLoading(true);try{const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({modelId,message:text})});const d=await r.json();const final=[...next,{role:"assistant",content:d.reply||d.error||"Unable to respond right now."}];setMessages(final);await persist(final)}catch{setMessages([...next,{role:"assistant",content:"Unable to respond right now. Please try again."}])}finally{setLoading(false)}}
 return <main className="chat">
  <header className="chatHeader"><div><span className="chatLogo">✦</span><div><b>KIVU AI</b><small>{model.subtitle}</small></div></div><select className="modelSelect" value={modelId} onChange={e=>changeModel(e.target.value)} aria-label="Select AI model">{Object.entries(models).map(([id,m]:any)=><option value={id} key={id}>{m.name}</option>)}</select></header>
  <div className="chatMessages">{!messages.length?<div className="empty"><div className="spark">✦</div><h1>{model.greeting}</h1><p>Ask anything. KIVU {model.name} is ready to help.</p><div className="suggestions"><button onClick={()=>setInput("Explain this topic simply")}>Explain a topic</button><button onClick={()=>setInput("Help me create a step-by-step plan")}>Make a plan</button><button onClick={()=>setInput("Give me practice questions")}>Practice questions</button></div></div>:messages.map((m:any,i:number)=><div className={"chatMessage "+m.role} key={i}>{m.content}</div>)}{loading&&<div className="chatMessage assistant thinking">✦ Thinking…</div>}</div>
  <div className="chatComposer"><textarea rows={1} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder={"Message "+model.name+"..."} /><button onClick={send} disabled={loading||!input.trim()} aria-label="Send message">↑</button></div><small className="chatHint">KIVU AI can make mistakes. Check important information.</small>
 </main>
}
export default function Chat(){return <Suspense fallback={<main className="chat"><div className="empty"><div className="spark">✦</div><h1>Loading KIVU AI...</h1></div></main>}><ChatContent/></Suspense>}