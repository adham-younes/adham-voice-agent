import { z } from 'zod'
import { DEFAULT_GREETING } from '@/lib/agent/personality'
import { VOICE_SETTINGS } from '@/lib/elevenlabs/agent'

const schema = z.object({ voiceId: z.string().min(1).max(100), text: z.string().max(300).optional() })
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'بيانات الصوت غير صالحة.' }, { status: 400 })
  if (!process.env.ELEVENLABS_API_KEY) return Response.json({ error: 'مفتاح ElevenLabs غير مهيأ في إعدادات البيئة.' }, { status: 503 })
  const { model_id, ...voice_settings } = VOICE_SETTINGS
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(parsed.data.voiceId)}`, {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY || '', 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: parsed.data.text || DEFAULT_GREETING, model_id, voice_settings, language_code: 'ar' }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) return Response.json({ error: `فشلت المعاينة الصوتية (${response.status}).` }, { status: response.status })
    return new Response(response.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: 'تعذر تجهيز المعاينة. أعد المحاولة.' }, { status: 502 })
  }
}
