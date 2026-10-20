'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Play, WandSparkles } from 'lucide-react'

type SampleStatus = { samples: { id: string; name: string; durationSeconds: number }[]; configured: boolean }
const testTexts = [
  'بص يا صاحبي، ناخدها واحدة واحدة. قولّي إيه اللي واقف معاك، وبعد كده نحدد أول خطوة.',
  'تمام، خلّي بالك من النقطة دي. نجرّب الحل الأول، ولو ما نفعش نشوف السبب ونكمل.',
  'مش متأكد من المعلومة دي. خلّينا نراجع المصدر الأول عشان أقولّك حاجة مظبوطة.',
]
export function SampleTraining() {
  const [data, setData] = useState<SampleStatus | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [message, setMessage] = useState('')
  const [loginRequired, setLoginRequired] = useState(false)
  const [result, setResult] = useState<{ voiceId: string; previousVoiceId?: string } | null>(null)
  const [testText, setTestText] = useState(testTexts[0])
  const player = useRef<HTMLAudioElement | null>(null)
  const audioUrl = useRef<string | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/agent/training', { cache: 'no-store' }).then(async response => {
      const body = await response.json()
      if (cancelled) return
      if (!response.ok) { setMessage(body.error); setLoginRequired(!!body.loginRequired) }
      else setData(body)
    }).catch(() => { if (!cancelled) setMessage('تعذر تحميل حالة العينات. حدّث الصفحة للمحاولة من جديد.') })
    return () => { cancelled = true; player.current?.pause(); if (audioUrl.current) URL.revokeObjectURL(audioUrl.current) }
  }, [])
  async function apply() {
    if (!files.length || files.length > 3 || files.reduce((sum, file) => sum + file.size, 0) > 4 * 1024 * 1024) { setMessage('اختر من ملف إلى ثلاثة ملفات بإجمالي لا يتجاوز 4MB.'); return }
    setBusy(true); setMessage(''); setResult(null)
    player.current?.pause()
    try {
      const form = new FormData()
      for (const file of files) form.append('files', file)
      const response = await fetch('/api/agent/training', { method: 'POST', body: form })
      const body = await response.json()
      if (!response.ok) {
        setLoginRequired(!!body.loginRequired)
        throw new Error(body.error + (body.voiceId ? ` معرّف الصوت المحفوظ: ${body.voiceId}` : ''))
      }
      setResult(body)
      setMessage('تم ربط صوت العينات والأسلوب وإعدادات الاستجابة بالوكيل، وتأكيد الإعدادات من الخدمة. جرّب المعاينة ومكالمة جديدة لتقييم التشابه.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذر تطبيق العينات. أعد المحاولة.') }
    finally { setBusy(false) }
  }
  async function preview() {
    if (!result) return
    setPreviewing(true); setMessage('')
    player.current?.pause()
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current)
    try {
      const response = await fetch('/api/voice-preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voiceId: result.voiceId, text: testText }) })
      if (!response.ok) throw new Error((await response.json()).error)
      audioUrl.current = URL.createObjectURL(await response.blob())
      const audio = new Audio(audioUrl.current)
      player.current = audio
      await audio.play()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذر تشغيل المعاينة.') }
    finally { setPreviewing(false) }
  }
  return <section className="mt-7 rounded-3xl border border-primary/25 bg-primary/5 p-6" aria-labelledby="sample-title">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
      <div><h2 id="sample-title" className="text-lg font-semibold">تطبيق تسجيلاتك على الصوت والأسلوب</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">إنشاء نسخة صوت من عينات واتساب وربطها بالوكيل، مع إرشادات لطريقتك في الكلام وردود أقصر. صوتك الحالي يظل متاحًا في صفحة هوية الصوت للرجوع إليه.</p></div>
      <button onClick={apply} disabled={busy || !data?.configured || !files.length} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"><WandSparkles className="size-4"/>{busy ? 'جاري تطبيق العينات…' : 'تطبيق الصوت والأسلوب'}</button>
    </div>
    <label className="mt-5 block text-sm font-medium" htmlFor="owner-samples">اختار التسجيلات الثلاثة من جهازك</label>
    <input id="owner-samples" type="file" multiple accept="audio/*,.opus,.flac" disabled={busy} onChange={event => { setFiles(Array.from(event.target.files || [])); setResult(null) }} className="mt-2 block w-full rounded-xl border border-border bg-background p-3 text-sm"/>
    <p className="mt-2 text-xs leading-6 text-muted-foreground">الملفات تُرسل للخدمة وقت التطبيق؛ لا تُنشر على GitHub. الحد الإجمالي 4MB. استخدم ملفات FLAC المجهّزة لو النسخ الأصلية ما اتقبلتش.</p>
    {data && <ul className="mt-5 space-y-2 text-sm">{data.samples.map((sample, i) => <li key={sample.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-border bg-background/50 px-4 py-3"><span>العينة {i + 1} · <bdi>{sample.name.replace('WhatsApp Audio ', '').replace('.opus', '')}</bdi></span><span className="text-muted-foreground">{Math.round(sample.durationSeconds)} ثانية</span></li>)}</ul>}
    <p className="mt-4 text-xs leading-6 text-muted-foreground">العينات حوالي دقيقتين و٢٢ ثانية وفيها انفعال؛ بنحافظ على طريقتك المباشرة من غير ما نخلي كل الردود عصبية. استنساخ الصوت يستخدم رصيد وخطة ElevenLabs؛ إعادة المحاولة تعيد استخدام نفس النسخة. التشابه يحتاج تقييمًا بالسمع، وده مش تدريب أوزان نموذج.</p>
    {data && !data.configured && <p className="mt-3 text-sm text-destructive">أضف مفتاح ElevenLabs في إعدادات البيئة لتفعيل التطبيق.</p>}
    {message && <p role="status" className="mt-4 break-words text-sm leading-7">{result && <CheckCircle2 className="ml-2 inline size-4 text-primary"/>}{message}</p>}
    {loginRequired && <Link href="/login" className="mt-3 inline-block text-sm text-primary underline">دخول المالك</Link>}
    {result && <div className="mt-5 border-t border-border pt-5"><label htmlFor="sample-test" className="text-sm font-medium">قارن النطق وطريقة الكلام</label><select id="sample-test" value={testText} onChange={event => setTestText(event.target.value)} className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm">{testTexts.map((text, i) => <option key={text} value={text}>{['سؤال ومساعدة', 'شرح وخطوة عملية', 'معلومة غير مؤكدة'][i]}</option>)}</select><p className="mt-3 text-sm leading-7">{testText}</p><div className="mt-4 flex flex-wrap gap-4"><button onClick={preview} disabled={previewing} className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm disabled:opacity-50"><Play className="size-4"/>{previewing ? 'جاري التجهيز…' : 'اسمع المعاينة'}</button><Link href="/" className="py-2 text-sm text-primary underline">اختبر الأسئلة في مكالمة جديدة</Link></div><p className="mt-3 text-xs leading-6 text-muted-foreground">جرّب سؤالًا جديدًا، سؤالًا ناقصًا، ووقفة قصيرة وسط الكلام. قارن اللهجة والنبرة والسرعة، وتأكد إنه ما بيقاطعكش.</p></div>}
  </section>
}
