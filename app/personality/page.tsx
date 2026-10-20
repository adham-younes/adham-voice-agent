'use client'

import { useState } from 'react'
import { DEFAULT_PERSONALITY } from '@/lib/agent/personality'
const chips=['مباشر','ذكي','عملي','عفوي','ساخر بخفة','حساس وقت اللزوم']
export default function Personality(){
  const [prompt,setPrompt]=useState(DEFAULT_PERSONALITY)
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')
  async function save(){setSaving(true);setMessage('');const response=await fetch('/api/agent/personality',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});const result=await response.json();setMessage(response.ok?'تم حفظ الشخصية داخل الوكيل الحقيقي.':result.error);setSaving(false)}
  return <div className="mx-auto max-w-5xl px-5 py-8 md:px-10"><p className="text-xs text-primary">AGENT PERSONA</p><h1 className="mt-1 text-3xl font-semibold">استوديو الشخصية</h1><p className="mt-2 text-sm text-muted-foreground">عدّل نبرة الوكيل واحفظها مباشرة في ElevenLabs.</p><div className="mt-8 flex flex-wrap gap-2">{chips.map(chip=><span key={chip} className="rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs text-primary">{chip}</span>)}</div><section className="mt-5 rounded-3xl border border-border bg-card p-6"><label htmlFor="prompt" className="text-sm font-semibold">التعليمات الأساسية</label><textarea id="prompt" value={prompt} onChange={event=>setPrompt(event.target.value)} className="mt-4 h-72 w-full resize-none rounded-2xl border border-border bg-background p-5 text-sm leading-8 outline-none focus:ring-1 focus:ring-primary"/><div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><p className={`text-xs ${message.startsWith('تم')?'text-primary':'text-muted-foreground'}`}>{message||'لن يدّعي الوكيل أنه الشخص الحقيقي، وسيحافظ على هوية مصرية صعيدية طبيعية.'}</p><button onClick={save} disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving?'جاري الحفظ…':'حفظ في الوكيل'}</button></div></section></div>
}
