import { NextResponse } from 'next/server'
import { eleven } from '@/lib/elevenlabs/api'
import { resolveAgentId } from '@/lib/elevenlabs/agent'

export async function GET() {
  try {
    const agentId = await resolveAgentId()
    if (!agentId) return NextResponse.json({ error: 'الوكيل غير مجهز بعد. افتح الإعدادات واضغط تجهيز الوكيل.' }, { status: 409 })
    const data = await eleven(`/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`) as { token: string }
    return NextResponse.json({ token: data.token })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر إنشاء جلسة.' }, { status: 502 })
  }
}
