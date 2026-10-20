import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { eleven } from './api'
import { configureAgent, getAgent, VOICE_SETTINGS } from './agent'
import { withSampleStyle } from '@/lib/agent/personality'

type Sample = { id: string; file: string; source: string; durationSeconds: number; sha256: string }
type Voice = { voice_id: string; labels?: Record<string, string>; requires_verification?: boolean }
export type TrainingResult = { agentId: string; voiceId: string; previousVoiceId?: string; verified: boolean; sampleCount: number }
export class TrainingError extends Error {
  code: string
  voiceId: string
  constructor(code: string, message: string, voiceId: string) {
    super(message)
    this.code = code
    this.voiceId = voiceId
  }
}

export async function sampleManifest(): Promise<{ samples: Sample[] }> {
  return JSON.parse(await readFile(join(process.cwd(), 'voice-samples/manifest.json'), 'utf8'))
}

const running = new Map<string, Promise<TrainingResult>>()
export async function trainFromSamples(files: File[]): Promise<TrainingResult> {
  if (!files.length || files.length > 3 || files.some(file => !file.size || !/\.(wav|flac|mp3|m4a|opus|ogg)$/i.test(file.name)) || files.reduce((sum, file) => sum + file.size, 0) > 4 * 1024 * 1024) {
    throw new Error('اختر من ملف إلى ثلاثة ملفات صوتية، بإجمالي لا يتجاوز 4MB.')
  }
  const digests = await Promise.all(files.map(async file => createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex')))
  const sampleSet = createHash('sha256').update(digests.sort().join(':')).digest('hex').slice(0, 32)
  const existing = running.get(sampleSet)
  if (existing) return existing
  const task = applySamples(files, sampleSet).finally(() => { running.delete(sampleSet) })
  running.set(sampleSet, task)
  return task
}

async function applySamples(files: File[], sampleSet: string): Promise<TrainingResult> {
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_NOT_CONFIGURED')
  // Check the target before creating a paid resource. Never infer a new agent
  // from a failed lookup or discard the currently working voice.
  const current = await getAgent()
  const previousVoiceId = current.conversation_config?.tts?.voice_id
  const expectedPrompt = withSampleStyle(current.conversation_config?.agent?.prompt?.prompt)
  const inventory = await eleven('/voices') as { voices?: Voice[] }
  let voice = inventory.voices?.find(item => item.labels?.owner_sample_set === sampleSet)
  if (!voice) {
    const form = new FormData()
    form.set('name', 'Adham · WhatsApp samples')
    form.set('description', 'Owner-provided Egyptian Arabic voice recordings, September 2026.')
    form.set('labels', JSON.stringify({ language: 'ar', accent: 'egyptian', owner_sample_set: sampleSet }))
    // No denoising or time stretching: both can distort the speaker identity.
    for (const file of files) form.append('files', file)
    voice = await eleven('/voices/add', { method: 'POST', body: form, signal: AbortSignal.timeout(120_000) }) as Voice
  }
  if (!voice?.voice_id) throw new Error('لم ترجع الخدمة معرّفًا للصوت المستنسخ.')
  const voiceId = voice.voice_id
  // Recheck on retries: a voice awaiting ownership verification must never
  // become active simply because it already appears in the account inventory.
  try {
    const detail = await eleven(`/voices/${encodeURIComponent(voiceId)}`) as Voice
    if (voice.requires_verification || detail.requires_verification) {
      throw new TrainingError('VOICE_VERIFICATION_REQUIRED', 'الصوت موجود، لكن ElevenLabs تطلب تأكيد ملكيته من حسابك قبل تفعيله. الصوت الحالي لم يتغير.', voiceId)
    }
  } catch (error) {
    if (error instanceof TrainingError) throw error
    throw new TrainingError('VOICE_CHECK_FAILED', 'الصوت موجود لكن تعذر فحص جاهزيته. أعد المحاولة؛ سيُعاد استخدامه.', voiceId)
  }
  let result
  try {
    result = await configureAgent(voiceId, { applySampleStyle: true })
  } catch (error) {
    throw new TrainingError('AGENT_UPDATE_FAILED', `الصوت محفوظ في حسابك، لكن لم يكتمل تحديث الوكيل. أعد المحاولة. ${error instanceof Error ? error.message : ''}`, voiceId)
  }
  try {
    const applied = (await getAgent()).conversation_config
    if (applied?.tts?.voice_id !== voiceId || applied.tts.model_id !== VOICE_SETTINGS.model_id || applied.agent?.prompt?.prompt !== expectedPrompt || applied.turn?.turn_eagerness !== 'eager') {
      throw new Error('configuration mismatch')
    }
  } catch {
    throw new TrainingError('AGENT_VERIFY_FAILED', 'تعذر تأكيد الإعدادات المحفوظة. لا نعتبر العملية مكتملة؛ أعد المحاولة لفحص الوكيل والصوت الموجود.', voiceId)
  }
  return { ...result, previousVoiceId, verified: true, sampleCount: files.length }
}
