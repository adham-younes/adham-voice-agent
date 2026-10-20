import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { eleven } from '@/lib/elevenlabs/api'

export async function GET() {
  try { await requireAuth() } catch { return NextResponse.json({ error: 'غير مصرح' }, { status: 401 }) }
  const agentId = process.env.ELEVENLABS_AGENT_ID
  if (!agentId) return NextResponse.json({ error: 'لم يتم ضبط ELEVENLABS_AGENT_ID بعد. أكمل الإعداد أولًا.' }, { status: 409 })
  try { const data = await eleven(`/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`); return NextResponse.json({ token: data.token }) }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر إنشاء جلسة.' }, { status: 502 }) }
}
