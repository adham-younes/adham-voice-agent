import { DEFAULT_PERSONALITY, DEFAULT_GREETING, withSampleStyle } from '@/lib/agent/personality'
import { eleven } from './api'
import { DEFAULT_CONVERSATION_MODEL, resolveConversationModel } from './models'

export type AgentConfig = {
  platform_settings?: { analysis_llm?: string; [key: string]: unknown }
  conversation_config?: {
    agent?: { first_message?: string; language?: string; prompt?: { prompt?: string; [key: string]: unknown }; [key: string]: unknown }
    tts?: { voice_id?: string; [key: string]: unknown }
    turn?: Record<string, unknown>
    [key: string]: unknown
  }
}

export const VOICE_SETTINGS = { model_id: 'eleven_flash_v2_5', stability: 0.45, similarity_boost: 0.85, speed: 1 }

const DEFAULT_AGENT_ID = 'agent_9201m4pnx77geef8dmw7rwzh1xjg'
const DEFAULT_VOICE_ID = 'OA7F3BEn6BYtmW4UHxbz'

function resolveOptionalId(value: string | undefined, fallback: string) {
  const normalized = value?.trim()
  if (!normalized || normalized === 'undefined' || normalized === 'null') return fallback
  return normalized
}

export async function resolveAgentId() {
  return resolveOptionalId(process.env.ELEVENLABS_AGENT_ID, DEFAULT_AGENT_ID)
}

export async function resolveVoiceId() {
  return resolveOptionalId(process.env.ELEVENLABS_VOICE_ID, DEFAULT_VOICE_ID)
}

export async function getAgent() {
  return eleven(`/convai/agents/${await resolveAgentId()}`) as Promise<AgentConfig>
}

export async function configureAgent(selectedVoiceId?: string, options?: { applySampleStyle?: boolean }) {
  const existingId = await resolveAgentId()
  const existing = existingId ? await getAgent() : {}
  const current = existing.conversation_config || {}
  const voiceId = selectedVoiceId || current.tts?.voice_id || await resolveVoiceId()
  if (!voiceId) throw new Error('اختر صوتًا من حساب ElevenLabs أولًا.')
  const model = resolveConversationModel(process.env.ELEVENLABS_LLM_MODEL)
  const conversationConfig = {
    ...current,
    agent: {
      ...current.agent,
      first_message: DEFAULT_GREETING,
      language: 'ar',
      prompt: {
        ...current.agent?.prompt,
        prompt: options?.applySampleStyle ? withSampleStyle(current.agent?.prompt?.prompt) : current.agent?.prompt?.prompt || DEFAULT_PERSONALITY,
        llm: model,
        // Flash-Lite uses reasoning effort rather than the old thinking budget.
        thinking_budget: null,
        reasoning_effort: model === DEFAULT_CONVERSATION_MODEL ? 'minimal' : null,
        temperature: 0.5,
        max_tokens: 800,
        timezone: 'Africa/Cairo',
      },
    },
    tts: { ...current.tts, ...VOICE_SETTINGS, voice_id: voiceId },
    // Eagerness controls end-of-turn detection. turn_timeout is a re-engagement
    // timer, not a response-latency control, so preserve its existing value.
    turn: { ...current.turn, turn_eagerness: 'eager' },
  }
  if (existingId) {
    const platformSettings = existing.platform_settings?.analysis_llm === 'gemini-2.5-flash'
      ? { platform_settings: { ...existing.platform_settings, analysis_llm: model } }
      : {}
    await eleven(`/convai/agents/${existingId}`, { method: 'PATCH', body: JSON.stringify({ conversation_config: conversationConfig, ...platformSettings }) })
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
