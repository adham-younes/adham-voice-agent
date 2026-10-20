import { NextResponse } from 'next/server'
import { eleven } from '@/lib/elevenlabs/api'
import { resolveAgentId, resolveVoiceId } from '@/lib/elevenlabs/agent'
import { DEFAULT_MODELS } from '@/lib/agent/personality'

export async function GET() {
  const status = { groq: false, elevenlabs: false, agentId: '', voiceId: '', models: { llm: process.env.GROQ_LLM_MODEL || DEFAULT_MODELS.llm, analysis: process.env.GROQ_ANALYSIS_MODEL || DEFAULT_MODELS.analysis, stt: process.env.GROQ_STT_MODEL || DEFAULT_MODELS.stt }, voices: [] as unknown[], agents: [] as unknown[], errors: [] as string[] }
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, cache: 'no-store' })
    status.groq = response.ok
    if (!response.ok) status.errors.push('تعذر التحقق من Groq.')
  } catch { status.errors.push('تعذر الاتصال بـ Groq.') }
  try {
    const [voices, agents] = await Promise.all([eleven('/voices'), eleven('/convai/agents')]) as [{ voices?: unknown[] }, { agents?: unknown[] }]
    status.elevenlabs = true
    status.voices = (voices.voices || []).map((voice) => {
      const item = voice as { voice_id?: string; name?: string; category?: string }
      return { voice_id: item.voice_id, name: item.name, category: item.category }
    })
    status.agents = (agents.agents || []).map((agent) => {
      const item = agent as { agent_id?: string; name?: string }
      return { agent_id: item.agent_id, name: item.name }
    })
    status.agentId = await resolveAgentId()
    status.voiceId = await resolveVoiceId()
  } catch (error) { status.errors.push(error instanceof Error ? error.message : 'تعذر الاتصال بـ ElevenLabs.') }
  return NextResponse.json(status)
}
