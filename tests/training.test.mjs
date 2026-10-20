import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { trainFromSamples } from '../lib/elevenlabs/training.ts'
import { withSampleStyle } from '../lib/agent/personality.ts'
const originalFetch = globalThis.fetch
const originalEnv = { ...process.env }
afterEach(() => { globalThis.fetch = originalFetch; process.env = { ...originalEnv } })
const files = () => [1, 2, 3].map(i => new File([new Uint8Array(120_000).fill(i)], `sample-${i}.wav`, { type: 'audio/wav' }))
function fakeProvider({ verification = false, rejectPatch = false, ignorePatch = false } = {}) {
  process.env.ELEVENLABS_API_KEY = 'test-key'
  let agent = { conversation_config: { agent: { prompt: { prompt: 'owner personal instructions', tool_ids: ['web'] } }, tts: { voice_id: 'original' } } }
  const voices = []
  const samples = []
  let patches = 0
  let clones = 0
  globalThis.fetch = async (url, init) => {
    const path = new URL(url).pathname
    if (path.endsWith('/voices/add')) {
      clones++
      const request = new Request(url, init)
      const form = await request.formData()
      samples.push(...form.getAll('files'))
      voices.push({ voice_id: 'sample-clone', labels: JSON.parse(form.get('labels')), requires_verification: verification, is_owner: true })
      return Response.json({ voice_id: 'sample-clone', requires_verification: verification })
    }
    if (path.endsWith('/voices')) return Response.json({ voices })
    if (path.endsWith('/voices/sample-clone')) return Response.json(voices[0])
    if (path.includes('/convai/agents/')) {
      if (init.method === 'PATCH') {
        patches++
        if (rejectPatch) return new Response('temporarily unavailable', { status: 503 })
        if (!ignorePatch) agent = JSON.parse(init.body)
      }
      return Response.json(agent)
    }
    throw new Error('Unexpected provider path: ' + path)
  }
  return { samples, get clones() { return clones }, get patches() { return patches }, get agent() { return agent } }
}

test('all three recordings reach cloning and the active agent is read back before success', async () => {
  const provider = fakeProvider()
  const result = await trainFromSamples(files())
  assert.equal(provider.samples.length, 3)
  assert.ok(provider.samples.every(file => file.type === 'audio/wav' && file.size > 100_000))
  assert.equal(result.voiceId, 'sample-clone')
  assert.equal(result.verified, true)
  assert.equal(provider.agent.conversation_config.tts.voice_id, 'sample-clone')
  assert.match(provider.agent.conversation_config.agent.prompt.prompt, /owner personal instructions/)
  assert.deepEqual(provider.agent.conversation_config.agent.prompt.tool_ids, ['web'])
})

test('retry reuses an existing sample clone instead of creating another paid voice', async () => {
  const provider = fakeProvider()
  await trainFromSamples(files())
  await trainFromSamples(files())
  assert.equal(provider.clones, 1)
})

test('verification-required voices do not replace the current working voice, including on retry', async () => {
  const provider = fakeProvider({ verification: true })
  await assert.rejects(trainFromSamples(files()), error => error.code === 'VOICE_VERIFICATION_REQUIRED' && error.voiceId === 'sample-clone')
  await assert.rejects(trainFromSamples(files()), error => error.code === 'VOICE_VERIFICATION_REQUIRED')
  assert.equal(provider.patches, 0)
  assert.equal(provider.clones, 1)
})

test('a created clone is reported when applying the agent configuration fails', async () => {
  const provider = fakeProvider({ rejectPatch: true })
  await assert.rejects(trainFromSamples(files()), error => error.code === 'AGENT_UPDATE_FAILED' && error.voiceId === 'sample-clone')
  assert.equal(provider.clones, 1)
})

test('a successful PATCH alone cannot report verified training', async () => {
  fakeProvider({ ignorePatch: true })
  await assert.rejects(trainFromSamples(files()), error => error.code === 'AGENT_VERIFY_FAILED')
})

test('missing provider credentials fail before any remote calls', async () => {
  delete process.env.ELEVENLABS_API_KEY
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('must not call') }
  await assert.rejects(trainFromSamples(files()), /ELEVENLABS_NOT_CONFIGURED/)
  assert.equal(calls, 0)
})

test('reapplying sample guidance preserves custom instructions without duplicating the block', () => {
  const first = withSampleStyle('owner instructions')
  assert.equal(withSampleStyle(first), first)
  assert.match(first, /owner instructions/)
})
