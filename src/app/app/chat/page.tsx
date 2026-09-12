"use client";
import { ChangeEvent, Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const models:any={teacher:{name:"Teacher",subtitle:"Learn with clear explanations and practical guidance",greeting:"What would you like to learn today?"},developer:{name:"Developer",subtitle:"Build websites, apps, systems and digital products",greeting:"What would you like to build?"},student:{name:"Student",subtitle:"Study, revise and understand lessons deeply",greeting:"What are we studying today?"},seller:{name:"Seller",subtitle:"Practical strategy for business, sales and growth",greeting:"What would you like to improve in your business?"},nesa_exam_rev:{name:"NESA EXAM Rev",subtitle:"Review examination questions with detailed explanations",greeting:"Upload an exam, PDF or photo and start revising."}};

function ChatContent(){
 const q=useSearchParams(),router=useRouter(),fileInput=useRef<HTMLInputElement>(null);
 const initial=q.get("model")||"teacher";
 const [modelId,setModelId]=useState(initial),[messages,setMessages]=useState<any[]>([]),[input,setInput]=useState(""),[loading,setLoading]=useState(false),[conversationId,setConversationId]=useState(q.get("conversation")||""),[files,setFiles]=useState<File[]>([]);
 const model=models[modelId]||models.teacher;
 useEffect(()=>{setModelId(q.get("model")||"teacher");const prompt=q.get("prompt");if(prompt)setInput(prompt)},[q]);
 function changeModel(id:string){setModelId(id);setMessages([]);setConversationId("");setFiles([]);router.replace("/app/chat?model="+id)}
 function addFiles(e:ChangeEvent<HTMLInputElement>){const chosen=Array.from(e.target.files||[]);setFiles(prev=>[...prev,...chosen].slice(0,5));e.target.value=""}
 async function persist(next:any[]){const r=await fetch("/api/conversations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:conversationId||undefined,title:next.find(x=>x.role==="user")?.content?.slice(0,60)||model.name,model:modelId,messages:next})});const d=await r.json();if(r.ok&&d.item&&!conversationId){setConversationId(d.item.id);router.replace("/app/chat?model="+modelId+"&conversation="+d.item.id)}}
 async function send(){
  const text=input.trim();if((!text&&!files.length)||loading)return;
  const labels=files.map(f=>"📎 "+f.name).join("\n");
  const display=[text,labels].filter(Boolean).join("\n");
  const next=[...messages,{role:"user",content:display}];setMessages(next);setInput("");setLoading(true);
  try{
   let attachmentText="";
   for(const file of files){const form=new FormData();form.append("file",file);const r=await fetch("/api/materials/analyze",{method:"POST",body:form});const d=await r.json();attachmentText+="\n\nFILE: "+file.name+"\n"+(d.text||d.error||"Could not extract text.");}
   setFiles([]);
   const prompt=(text||"Please analyze this uploaded material.")+attachmentText;
   const images:any[]=[];
   for(const file of files.filter(f=>f.type.startsWith("image/"))){
     const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=reject;reader.readAsDataURL(file)});
     if(data)images.push({mediaType:file.type,data});
   }
   const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({modelId,message:prompt,images})});
   const d=await r.json();const final=[...next,{role:"assistant",content:d.reply||d.error||"Unable to respond right now."}];setMessages(final);await persist(final)
  }catch{setMessages([...next,{role:"assistant",content:"Unable to analyze this file right now. Please try again."}])}finally{setLoading(false)}
 }
 return <main className="chat">
  <header className="chatHeader"><div><span className="chatLogo">✦</span><div><b>KIVU AI</b><small>{model.subtitle}</small></div></div><select className="modelSelect" value={modelId} onChange={e=>changeModel(e.target.value)}>{Object.entries(models).map(([id,m]:any)=><option value={id} key={id}>{m.name}</option>)}</select></header>
  <div className="chatMessages">{!messages.length?<div className="empty"><div className="spark">✦</div><h1>{model.greeting}</h1><p>Ask anything, or upload a PDF, exam paper, document or image for AI analysis.</p><div className="suggestions"><button onClick={()=>setInput("Explain this topic simply")}>Explain a topic</button><button onClick={()=>setInput("Create a quiz from this material")}>Create a quiz</button><button onClick={()=>fileInput.current?.click()}>Upload study material</button></div></div>:messages.map((m:any,i:number)=><div className={"chatMessage "+m.role} key={i}>{m.content}</div>)}{loading&&<div className="chatMessage assistant thinking">✦ Analyzing…</div>}</div>
  <div className="chatComposerWrap">
   {files.length>0&&<div className="fileChips">{files.map((f,i)=><span key={f.name+i}>📎 {f.name}<button onClick={()=>setFiles(x=>x.filter((_,n)=>n!==i))}>×</button></span>)}</div>}
   <div className="chatComposer"><input ref={fileInput} type="file" hidden multiple accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp" onChange={addFiles}/><button className="attachButton" onClick={()=>fileInput.current?.click()} aria-label="Upload file">+</button><textarea rows={1} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder={"Message "+model.name+"..."} /><button className="sendButton" onClick={send} disabled={loading||(!input.trim()&&!files.length)} aria-label="Send">↑</button></div>
  </div><small className="chatHint">Upload PDFs, documents, exams or images for analysis.</small>
 </main>
}
export default function Chat(){return <Suspense fallback={<main className="chat"><div className="empty"><div className="spark">✦</div><h1>Loading KIVU AI...</h1></div></main>}><ChatContent/></Suspense>}