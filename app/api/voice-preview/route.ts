import { z } from 'zod'

const schema = z.object({ voiceId: z.string().min(1).max(100), text: z.string().max(300).optional() })
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'بيانات الصوت غير صالحة.' }, { status: 400 })
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(parsed.data.voiceId)}`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY || '', 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: parsed.data.text || 'يا مرحب يا واد عمي، عامل إيه؟ قولّي عاوز نعمل إيه النهارده.', model_id: 'eleven_multilingual_v2' }),
  })
  if (!response.ok) return Response.json({ error: `فشلت المعاينة الصوتية (${response.status}).` }, { status: response.status })
  return new Response(response.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
}
