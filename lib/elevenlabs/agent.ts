import { CORE_PERSONALITY, DEFAULT_GREETING } from '@/lib/agent/personality'
import { eleven } from './api'

type AgentSummary = { agent_id: string; name: string }
type VoiceSummary = { voice_id: string; name: string; category?: string }

export async function resolveAgentId() {
  if (process.env.ELEVENLABS_AGENT_ID) return process.env.ELEVENLABS_AGENT_ID
  const result = await eleven('/convai/agents') as { agents?: AgentSummary[] }
  return result.agents?.find((agent) => agent.name === 'ADHAM VOICE AI')?.agent_id || ''
}

export async function resolveVoiceId() {
  if (process.env.ELEVENLABS_VOICE_ID) return process.env.ELEVENLABS_VOICE_ID
  const result = await eleven('/voices') as { voices?: VoiceSummary[] }
  return result.voices?.find((voice) => voice.category === 'cloned')?.voice_id || result.voices?.[0]?.voice_id || ''
}

export async function configureAgent(selectedVoiceId?: string) {
  const voiceId = selectedVoiceId || await resolveVoiceId()
  if (!voiceId) throw new Error('اختر صوتًا من حساب ElevenLabs أولًا.')
  const model = process.env.ELEVENLABS_LLM_MODEL || 'gemini-2.5-flash'
  const conversationConfig = {
    agent: {
      first_message: DEFAULT_GREETING,
      language: 'ar',
      prompt: {
        prompt: CORE_PERSONALITY,
        llm: model,
      },
    },
    tts: { voice_id: voiceId, model_id: 'eleven_multilingual_v2' },
  }
  const existingId = await resolveAgentId()
  if (existingId) {
    await eleven(`/convai/agents/${existingId}`, { method: 'PATCH', body: JSON.stringify({ conversation_config: conversationConfig }) })
    return { agentId: existingId, voiceId, created: false }
  }
  const created = await eleven('/convai/agents/create', { method: 'POST', body: JSON.stringify({ name: 'ADHAM VOICE AI', conversation_config: conversationConfig }) }) as { agent_id: string }
  return { agentId: created.agent_id, voiceId, created: true }
}

export async function updateAgentPrompt(prompt: string) {
  const agentId = await resolveAgentId()
  if (!agentId) throw new Error('جهّز الوكيل أولًا من صفحة الإعدادات.')
  const current = await eleven(`/convai/agents/${agentId}`) as { conversation_config?: Record<string, unknown> }
  const config = structuredClone(current.conversation_config || {}) as { agent?: { prompt?: Record<string, unknown> } }
  config.agent ||= {}
  config.agent.prompt ||= {}
  config.agent.prompt.prompt = prompt
  await eleven(`/convai/agents/${agentId}`, { method: 'PATCH', body: JSON.stringify({ conversation_config: config }) })
  return { agentId, prompt }
}
