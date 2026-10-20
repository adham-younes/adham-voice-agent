'use client'

import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, PhoneOff, Send, Waves } from 'lucide-react'

type Message = { id: string; role: 'user'|'agent'; text: string }
function voiceError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  if (/not found|NotFoundError/i.test(message) && /device|microphone/i.test(message)) return 'لم يتم العثور على ميكروفون. وصّل ميكروفون ثم أعد المحاولة.'
  if (/permission|denied|NotAllowedError/i.test(message)) return 'اسمح باستخدام الميكروفون من إعدادات المتصفح، ثم أعد المحاولة.'
  return message || 'تعذر الاتصال الصوتي. أعد المحاولة.'
}
function VoiceConsoleInner() {
  const [messages,setMessages]=useState<Message[]>([]); const [error,setError]=useState(''); const [text,setText]=useState(''); const [seconds,setSeconds]=useState(0); const [busy,setBusy]=useState(false)
  const conversation=useConversation({
    onConnect: () => setBusy(false),
    onDisconnect: () => setBusy(false),
    onMessage: (message: unknown) => { const m=message as {message?:string;source?:string}; if(m.message)setMessages(v=>[...v,{id:crypto.randomUUID(),role:m.source==='user'?'user':'agent',text:m.message!}]) },
    onError: (message: unknown) => { setBusy(false); setError(voiceError(message)) },
  })
  const active=conversation.status==='connected'; const bottom=useRef<HTMLDivElement>(null)
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth'})},[messages])
  useEffect(()=>{if(!active)return; const t=setInterval(()=>setSeconds(v=>v+1),1000); return()=>clearInterval(t)},[active])
  async function start(){if(busy||active)return;setBusy(true);setError('');try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('المتصفح لا يدعم تشغيل الميكروفون.');const r=await fetch('/api/conversation-token',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);if(typeof d.signedUrl!=='string'||!d.signedUrl.startsWith('wss://'))throw new Error('رابط الجلسة غير صالح. أعد المحاولة.');await conversation.startSession({signedUrl:d.signedUrl,connectionType:'websocket'})}catch(e){setBusy(false);setError(voiceError(e))}}
  function submit(e:FormEvent){e.preventDefault();if(!text.trim()||!active)return;conversation.sendUserMessage(text.trim());setText('')}
  const bars=Array.from({length:28},(_,i)=>18+((i*17)%44))
  return <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-7 md:px-10">
    <header className="flex items-center justify-between"><div><p className="text-xs text-primary">ADHAM VOICE AI</p><h1 className="mt-1 text-2xl font-semibold">المحادثة الصوتية</h1></div><span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"><i className={`ml-2 inline-block size-2 rounded-full ${active?'bg-primary':'bg-muted-foreground'}`}/>{active?'متصل':'جاهز'}</span></header>
    <section className="grid flex-1 items-center gap-7 py-8 lg:grid-cols-[1.2fr_.8fr]">
      <div className="flex flex-col items-center text-center"><div className={`voice-orb ${active?'active':''}`}><div className="flex h-24 items-center gap-1">{bars.map((h,i)=><i key={i} style={{height:`${active?h:12}%`,animationDelay:`${i*45}ms`}}/>)}</div></div><h2 className="mt-7 text-3xl font-semibold">{active&&conversation.isSpeaking?'بيتكلم دلوقتي':active&&conversation.isListening?'سامعك…':'أهلاً يا صاحبي'}</h2><p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">محادثة مباشرة بصوتك المختار. طبّق عيناتك من استوديو التدريب، وجرّب اللهجة وطريقة الرد بنفسك.</p><div className="mt-7 flex items-center gap-3">{!active?<button disabled={busy} onClick={start} className="rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-[0_0_35px_rgba(32,227,138,.2)] disabled:opacity-50"><Mic className="ml-2 inline size-4"/>{busy?'جاري الاتصال…':'ابدأ المحادثة'}</button>:<><button onClick={()=>conversation.setMuted(!conversation.isMuted)} className="grid size-12 place-items-center rounded-full border border-border bg-card">{conversation.isMuted?<MicOff/>:<Mic/>}</button><button onClick={()=>{conversation.endSession();setSeconds(0)}} className="grid size-12 place-items-center rounded-full bg-destructive text-white"><PhoneOff/></button></>}</div>{active&&<p className="mt-4 font-mono text-xs text-muted-foreground" dir="ltr">{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</p>}{error&&<p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}</div>
      <div className="flex h-[500px] flex-col overflow-hidden rounded-3xl border border-border bg-card/70"><div className="flex items-center gap-2 border-b border-border px-5 py-4"><Waves className="size-4 text-primary"/><b className="text-sm">النص المباشر</b></div><div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">{messages.length===0?<div className="m-auto text-center text-sm text-muted-foreground">هيظهر الكلام هنا أول ما تبدأ المحادثة.</div>:messages.map(m=><div key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${m.role==='user'?'mr-auto bg-secondary':'ml-auto bg-primary/10 text-foreground'}`}><span className="mb-1 block text-[10px] text-muted-foreground">{m.role==='user'?'أنت':'ADHAM AI'}</span>{m.text}</div>)}<div ref={bottom}/></div><form onSubmit={submit} className="flex gap-2 border-t border-border p-3"><input value={text} onChange={e=>setText(e.target.value)} disabled={!active} placeholder="اكتب رسالة أثناء الجلسة…" className="min-w-0 flex-1 rounded-xl bg-secondary px-4 text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"/><button aria-label="إرسال" disabled={!active||!text.trim()} className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"><Send className="size-4"/></button></form></div>
    </section>
  </div>
}
export function VoiceConsole(){return <ConversationProvider><VoiceConsoleInner/></ConversationProvider>}
