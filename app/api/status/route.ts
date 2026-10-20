import { NextResponse } from 'next/server'
import { eleven } from '@/lib/elevenlabs/api'
import { getAgent, resolveAgentId, resolveVoiceId } from '@/lib/elevenlabs/agent'
import { DEFAULT_MODELS } from '@/lib/agent/personality'
import { resolveConversationModel } from '@/lib/elevenlabs/models'

export async function GET() {
  const status = {
    groq: false, elevenlabs: false, agentId: '', voiceId: '',
    models: { llm: resolveConversationModel(process.env.ELEVENLABS_LLM_MODEL), analysis: process.env.GROQ_ANALYSIS_MODEL || DEFAULT_MODELS.analysis, stt: process.env.GROQ_STT_MODEL || DEFAULT_MODELS.stt, tts: '' },
    voices: [] as { voice_id?: string; name?: string; category?: string }[],
    agents: [] as { agent_id?: string; name?: string }[], errors: [] as string[],
  }
  await Promise.all([
    (async () => {
      if (!process.env.GROQ_API_KEY) { status.errors.push('مفتاح Groq غير مهيأ؛ تفريغ الملفات الجديدة غير متاح.'); return }
      try {
        const response = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, cache: 'no-store', signal: AbortSignal.timeout(10_000) })
        status.groq = response.ok
        if (!response.ok) status.errors.push('تعذر التحقق من Groq.')
      } catch { status.errors.push('تعذر الاتصال بـ Groq.') }
    })(),
    (async () => {
      try {
        const [voices, agents] = await Promise.all([eleven('/voices'), eleven('/convai/agents')]) as [{ voices?: typeof status.voices }, { agents?: typeof status.agents }]
        status.elevenlabs = true
        status.voices = (voices.voices || []).map(({ voice_id, name, category }) => ({ voice_id, name, category }))
        status.agents = (agents.agents || []).map(({ agent_id, name }) => ({ agent_id, name }))
        try {
          const config = (await getAgent()).conversation_config
          if (!config) throw new Error('لم ترجع الخدمة إعدادات الوكيل.')
          status.agentId = await resolveAgentId()
          status.voiceId = config.tts?.voice_id || ''
          status.models.tts = String(config.tts?.model_id || '')
          status.models.llm = String(config.agent?.prompt?.llm || status.models.llm)
        } catch { status.errors.push('تعذر تأكيد إعدادات الوكيل المحدد. راجع معرّف الوكيل والصلاحيات.'); status.voiceId = await resolveVoiceId() }
        if (!status.voices.some(voice => voice.voice_id === status.voiceId)) { status.voiceId = ''; status.errors.push('الصوت المحدد غير متاح في حساب ElevenLabs.') }
      } catch (error) { status.errors.push(error instanceof Error ? error.message : 'تعذر الاتصال بـ ElevenLabs.') }
    })(),
  ])
  return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } })
}
