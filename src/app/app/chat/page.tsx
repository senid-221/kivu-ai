"use client";

import { ChangeEvent, Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrainCircuit, ChevronDown, FileText, GraduationCap, Image as ImageIcon, Loader2, Paperclip, Plus, Send, X } from "lucide-react";

const models: Record<string, { name: string; subtitle: string; greeting: string }> = {
  teacher: { name: "Umwarimu", subtitle: "Ibisobanuro byoroshye • Ubuyobozi bwumvikana", greeting: "Ni iki nagufasha kwiga uyu munsi?" },
  developer: { name: "Developer", subtitle: "Kubaka websites na applications • Byoroshye", greeting: "Ni iki ushaka kubaka?" },
  student: { name: "Umunyeshuri", subtitle: "Iga, subiramo kandi usobanukirwe", greeting: "Ni iki turi kwiga uyu munsi?" },
  seller: { name: "Ubucuruzi", subtitle: "Business, sales and growth guidance", greeting: "Ni iki ushaka kunoza?" },
  nesa_exam_rev: { name: "NESA Isuzuma", subtitle: "Ibizamini byabanje, imyitozo n’ibisobanuro byumvikana", greeting: "Baza ikibazo cyo gusubiramo cyangwa usabe imyitozo ishingiye ku bizamini byabanje." },
};

function cleanDisplayedAiText(value: string) {
  return String(value ?? "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`{1,3}/g, "")
    .replace(/[•●▪◦]/g, "-")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function ThinkingIndicator() {
  return (
    <div className="thinkingIndicator" role="status" aria-live="polite">
      <span className="thinkingIcon"><BrainCircuit size={18} /></span>
      <span>Ndimo gutekereza</span>
      <span className="thinkingDots" aria-hidden="true"><i>.</i><i>.</i><i>.</i><i>.</i><i>.</i><i>.</i><i>.</i><i>.</i></span>
    </div>
  );
}

function ChatContent() {
  const q = useSearchParams();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const initial = q.get("model") || "teacher";
  const [modelId, setModelId] = useState(initial);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(q.get("conversation") || "");
  const [files, setFiles] = useState<File[]>([]);
  const model = models[modelId] || models.teacher;

  useEffect(() => {
    setModelId(q.get("model") || "teacher");
    const prompt = q.get("prompt");
    if (prompt) setInput(prompt);
  }, [q]);

  function changeModel(id: string) {
    setModelId(id); setMessages([]); setConversationId(""); setFiles([]);
    router.replace("/app/chat?model=" + id);
  }

  function addFiles(e: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...chosen].slice(0, 5));
    e.target.value = "";
  }

  async function persist(next: any[]) {
    const r = await fetch("/api/conversations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: conversationId || undefined, title: next.find(x => x.role === "user")?.content?.slice(0, 60) || model.name, model: modelId, messages: next })
    });
    const d = await r.json();
    if (r.ok && d.item && !conversationId) {
      setConversationId(d.item.id);
      router.replace("/app/chat?model=" + modelId + "&conversation=" + d.item.id);
    }
  }

  async function send() {
    const text = input.trim();
    const selectedFiles = [...files];
    if ((!text && !selectedFiles.length) || loading) return;

    const labels = selectedFiles.map(f => "📎 " + f.name).join("\n");
    const display = [text, labels].filter(Boolean).join("\n");
    const next = [...messages, { role: "user", content: display }];
    setMessages(next); setInput(""); setFiles([]); setLoading(true);

    try {
      let attachmentText = "";
      for (const file of selectedFiles) {
        const form = new FormData(); form.append("file", file);
        const r = await fetch("/api/materials/analyze", { method: "POST", body: form });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(typeof d.error === "string" ? d.error : "Could not analyze " + file.name + ".");
        }
        attachmentText += "\n\nFILE: " + file.name + "\n" + (d.text || "Could not extract text.");
      }

      const images: { mediaType: string; data: string }[] = [];
      for (const file of selectedFiles.filter(f => f.type.startsWith("image/"))) {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
          reader.onerror = reject; reader.readAsDataURL(file);
        });
        if (data) images.push({ mediaType: file.type, data });
      }

      const prompt = (text || "Sobanura kandi usesengure iki kintu nashyizemo.") + attachmentText;
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId, message: prompt, images }) });
      const d = await r.json().catch(() => ({}));
      const reply = r.ok && typeof d.reply === "string"
        ? d.reply
        : (typeof d.error === "string" && !d.error.trim().startsWith("{")
          ? d.error
          : "EDUKA could not complete this request right now. Please try again later.");
      const final = [...next, { role: "assistant", content: reply }];
      setMessages(final); await persist(final);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "EDUKA could not complete this request right now. Please try again.";
      setMessages([...next, { role: "assistant", content: message }]);
    } finally { setLoading(false); }
  }

  return <main className="agentChat">
    <header className="agentHeader">
      <div className="agentBrand"><span className="agentBrandMark"><BrainCircuit size={18} /></span><div><b>EDUKA</b><small>Ubufasha bw'ubwenge buhangano • AI workspace</small></div></div>
      <div className="agentHeaderTools">
        <div className="agentModelWrap"><BrainCircuit size={14} /><select value={modelId} onChange={e => changeModel(e.target.value)} aria-label="Hitamo uburyo bwa AI">{Object.entries(models).map(([id, m]) => <option value={id} key={id}>{m.name}</option>)}</select><ChevronDown size={14} /></div>
      </div>
    </header>

    <section className="agentMessages">
      {!messages.length ? <div className="agentWelcome">
        <div className="agentWelcomeBadge"><GraduationCap size={24} /></div>
        <p className="agentEyebrow">EDUKA AGENT</p>
        <h1>{model.greeting}</h1>
        <p>{modelId === "developer"
          ? "Sobanura website, application cyangwa system ushaka kubaka. EDUKA iragufasha gutegura, kwandika no gukosora code."
          : "Baza ikibazo cyangwa shyiraho PDF, inyandiko, ikizamini cyangwa ifoto. EDUKA irayisesengura ikagufasha kuyisobanukirwa."}</p>
        <div className="agentPromptGrid">
          <button onClick={() => setInput(modelId === "developer" ? "Mfasha kubaka website igezweho" : "Sobanura iki gice intambwe ku yindi")}>{modelId === "developer" ? "Kubaka website" : "Sobanura isomo"}</button>
          <button onClick={() => setInput(modelId === "nesa_exam_rev" ? "Nkorera imyitozo ya NESA ishingiye ku bibazo byabanje, ijyanye n'urwego n'isomo ryanjye" : modelId === "developer" ? "Mfasha gukosora code yanjye" : "Mpa urugero hanyuma ungerageze kureba niba nasobanukiwe")}>{modelId === "nesa_exam_rev" ? "Imyitozo ya NESA" : modelId === "developer" ? "Gukosora code" : "Imenyereze"}</button>
          <button onClick={() => fileInput.current?.click()}><Paperclip size={15} /> {modelId === "developer" ? "Soma code cyangwa inyandiko" : "Soma inyandiko"}</button>
        </div>
      </div> : messages.map((m, i) => <div className={"agentMessage " + m.role} key={i}>
        {m.role === "assistant" && <div className="messageAvatar"><GraduationCap size={15} /></div>}
        <div className="messageBubble">{m.role === "assistant" ? cleanDisplayedAiText(m.content) : m.content}</div>
      </div>)}
      {loading && <ThinkingIndicator />}
    </section>

    <div className="agentComposerArea">
      {files.length > 0 && <div className="agentAttachments">{files.map((f, i) => <div className="agentAttachment" key={f.name + i}>
        {f.type.startsWith("image/") ? <ImageIcon size={16} /> : <FileText size={16} />}<span>{f.name}</span><button onClick={() => setFiles(x => x.filter((_, n) => n !== i))}><X size={14} /></button>
      </div>)}</div>}
      <div className="agentComposer">
        <input ref={fileInput} type="file" hidden multiple accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp" onChange={addFiles} />
        <button className="composerPlus" onClick={() => fileInput.current?.click()} aria-label="Upload file"><Plus size={21} /></button>
        <textarea rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={"Andika ubutumwa bwawe..." } />
        <button className="composerModel" onClick={() => {}} title="AI ukoresha ubu"><BrainCircuit size={14} /><span>{model.name}</span><ChevronDown size={13} /></button>
        <button className="composerSend" onClick={send} disabled={loading || (!input.trim() && !files.length)} aria-label="Ohereza ubutumwa">{loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}</button>
      </div>
      <p className="agentDisclaimer">EDUKA ishobora kwibeshya. Buri gihe genzura amakuru y'ingenzi.</p>
    </div>
  </main>;
}

export default function Chat() {
  return <Suspense fallback={<main className="agentChat"><div className="agentWelcome"><div className="agentWelcomeBadge"><GraduationCap size={24} /></div><h1>EDUKA irimo gutangira...</h1></div></main>}><ChatContent /></Suspense>;
}