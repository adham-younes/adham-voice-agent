import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { DEFAULT_MODELS } from '@/lib/agent/personality'

const LIMIT = 20 * 1024 * 1024
export async function POST(request: Request) {
  try { await requireAuth() } catch { return NextResponse.json({ error: 'غير مصرح' }, { status: 401 }) }
  const incoming = await request.formData(); const file = incoming.get('file')
  if (!(file instanceof File) || file.size > LIMIT) return NextResponse.json({ error: 'اختر ملف صوت صالح لا يتجاوز 20MB.' }, { status: 400 })
  const form = new FormData(); form.set('file', file); form.set('model', process.env.GROQ_STT_MODEL || DEFAULT_MODELS.stt); form.set('language', 'ar'); form.set('response_format', 'json')
  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: form })
  if (!response.ok) return NextResponse.json({ error: `فشل النسخ الصوتي (${response.status}).` }, { status: response.status })
  return NextResponse.json(await response.json())
}
