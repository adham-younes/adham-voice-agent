import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { eleven } from '@/lib/elevenlabs/api'
import { DEFAULT_MODELS } from '@/lib/agent/personality'

export async function GET() {
  try { await requireAuth() } catch { return NextResponse.json({ error: 'غير مصرح' }, { status: 401 }) }
  const status = { groq: false, elevenlabs: false, agentId: process.env.ELEVENLABS_AGENT_ID || '', voiceId: process.env.ELEVENLABS_VOICE_ID || '', models: { llm: process.env.GROQ_LLM_MODEL || DEFAULT_MODELS.llm, analysis: process.env.GROQ_ANALYSIS_MODEL || DEFAULT_MODELS.analysis, stt: process.env.GROQ_STT_MODEL || DEFAULT_MODELS.stt }, voices: [] as unknown[], agents: [] as unknown[], errors: [] as string[] }
  try { const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, cache: 'no-store' }); status.groq = r.ok; if (!r.ok) status.errors.push('تعذر التحقق من Groq.') } catch { status.errors.push('تعذر الاتصال بـ Groq.') }
  try { const [voices, agents] = await Promise.all([eleven('/voices'), eleven('/convai/agents')]); status.elevenlabs = true; status.voices = voices.voices || []; status.agents = agents.agents || [] } catch (e) { status.errors.push(e instanceof Error ? e.message : 'تعذر الاتصال بـ ElevenLabs.') }
  return NextResponse.json(status)
}
