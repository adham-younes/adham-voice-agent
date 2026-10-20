import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { configureAgent } from '../lib/elevenlabs/agent.ts'
import { eleven } from '../lib/elevenlabs/api.ts'
const originalFetch = globalThis.fetch
const originalEnv = { ...process.env }
afterEach(() => { globalThis.fetch = originalFetch; process.env = { ...originalEnv } })

test('updating latency settings preserves the live voice, personality and knowledge tools', async () => {
  process.env.ELEVENLABS_API_KEY = 'test-key'
  delete process.env.ELEVENLABS_VOICE_ID
  const current = { conversation_config: { agent: { prompt: { prompt: 'owner-customized', tool_ids: ['search'], knowledge_base: [{ id: 'kb' }] } }, tts: { voice_id: 'live-trained-voice' }, conversation: { max_duration_seconds: 900 } } }
  let patched
  globalThis.fetch = async (_url, init) => {
    if (init.method === 'PATCH') { patched = JSON.parse(init.body); return Response.json({ agent_id: 'existing' }) }
    return Response.json(current)
  }
  const result = await configureAgent()
  assert.equal(result.voiceId, 'live-trained-voice')
  assert.equal(patched.conversation_config.agent.prompt.prompt, 'owner-customized')
  assert.deepEqual(patched.conversation_config.agent.prompt.tool_ids, ['search'])
  assert.deepEqual(patched.conversation_config.agent.prompt.knowledge_base, [{ id: 'kb' }])
  assert.equal(patched.conversation_config.conversation.max_duration_seconds, 900)
  assert.equal(patched.conversation_config.tts.model_id, 'eleven_flash_v2_5')
})

test('explicitly choosing a voice changes only that voice and keeps the owner prompt', async () => {
  process.env.ELEVENLABS_API_KEY = 'test-key'
  let patched
  globalThis.fetch = async (_url, init) => {
    if (init.method === 'PATCH') { patched = JSON.parse(init.body); return Response.json({}) }
    return Response.json({ conversation_config: { agent: { prompt: { prompt: 'keep this' } }, tts: { voice_id: 'old' } } })
  }
  const result = await configureAgent('chosen')
  assert.equal(result.voiceId, 'chosen')
  assert.equal(patched.conversation_config.agent.prompt.prompt, 'keep this')
})

test('multipart voice samples use a browser-generated boundary rather than JSON content type', async () => {
  process.env.ELEVENLABS_API_KEY = 'test-key'
  const form = new FormData()
  form.append('files', new File(['RIFF'], 'sample.wav', { type: 'audio/wav' }))
  globalThis.fetch = async (_url, init) => {
    const request = new Request('https://api.elevenlabs.io/v1/voices/add', init)
    assert.match(request.headers.get('Content-Type'), /^multipart\/form-data; boundary=/)
    const parsed = await request.formData()
    assert.equal(parsed.get('files').name, 'sample.wav')
    return Response.json({ voice_id: 'clone' })
  }
  assert.equal((await eleven('/voices/add', { method: 'POST', body: form })).voice_id, 'clone')
})

test('preview uses the same voice model and settings as live conversations', async () => {
  process.env.ELEVENLABS_API_KEY = 'test-key'
  const { POST } = await import('../app/api/voice-preview/route.ts')
  let sent
  globalThis.fetch = async (_url, init) => { sent = JSON.parse(init.body); return new Response('audio', { headers: { 'Content-Type': 'audio/mpeg' } }) }
  const response = await POST(new Request('http://localhost/api/voice-preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voiceId: 'clone' }) }))
  assert.equal(response.status, 200)
  assert.equal(sent.model_id, 'eleven_flash_v2_5')
  assert.equal(sent.voice_settings.similarity_boost, 0.85)
  assert.doesNotMatch(sent.text, /يا واد عمي/)
})

test('a legacy Gemini setting is migrated without retaining its thinking budget or changing the voice', async () => {
  process.env.ELEVENLABS_API_KEY = 'test-key'
  process.env.ELEVENLABS_LLM_MODEL = 'gemini-2.5-flash'
  const current = { conversation_config: { agent: { prompt: { prompt: 'owner instructions', llm: 'gemini-2.5-flash', thinking_budget: 0, tool_ids: ['lookup'] } }, tts: { voice_id: 'original-owner-voice' } }, platform_settings: { analysis_llm: 'gemini-2.5-flash', analysis_llm_billed: false, privacy: { record_voice: false } } }
  let patched
  globalThis.fetch = async (_url, init) => {
    if (init.method === 'PATCH') { patched = JSON.parse(init.body); return Response.json({}) }
    return Response.json(current)
  }
  const result = await configureAgent()
  assert.equal(result.voiceId, 'original-owner-voice')
  assert.equal(patched.conversation_config.agent.prompt.llm, 'gemini-3.5-flash-lite')
  assert.equal(patched.conversation_config.agent.prompt.thinking_budget, null)
  assert.equal(patched.conversation_config.agent.prompt.reasoning_effort, 'minimal')
  assert.equal(patched.conversation_config.agent.prompt.prompt, 'owner instructions')
  assert.deepEqual(patched.conversation_config.agent.prompt.tool_ids, ['lookup'])
  assert.equal(patched.platform_settings.analysis_llm, 'gemini-3.5-flash')
  assert.equal(patched.platform_settings.analysis_llm_billed, false)
  assert.deepEqual(patched.platform_settings.privacy, { record_voice: false })
})
