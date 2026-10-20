import { NextResponse } from 'next/server'
import { eleven } from '@/lib/elevenlabs/api'
import { resolveAgentId } from '@/lib/elevenlabs/agent'

export async function GET() {
  try {
    const agentId = await resolveAgentId()
    if (!agentId) return NextResponse.json({ error: 'الوكيل غير مجهز بعد. افتح الإعدادات واضغط تجهيز الوكيل.' }, { status: 409 })
    const data = await eleven(`/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`) as { signed_url?: string }
    if (!data.signed_url || !data.signed_url.startsWith('wss://')) {
      throw new Error('لم تُرجع ElevenLabs رابط اتصال صوتي صالحًا. حاول مرة أخرى.')
    }
    return NextResponse.json({ signedUrl: data.signed_url }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر إنشاء جلسة.' }, { status: 502 })
  }
}
