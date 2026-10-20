import { isAuthenticated } from '@/lib/auth/session'
import { sampleManifest, trainFromSamples, TrainingError } from '@/lib/elevenlabs/training'

export const runtime = 'nodejs'
export const maxDuration = 180

async function access() {
  if (!process.env.ADMIN_PASSWORD) return Response.json({ error: 'اضبط ADMIN_PASSWORD في إعدادات البيئة لحماية التسجيلات، ثم سجّل دخول المالك.' }, { status: 503 })
  if (!(await isAuthenticated())) return Response.json({ error: 'سجّل دخول المالك لتطبيق عينات صوتك.', loginRequired: true }, { status: 401 })
}

export async function GET() {
  const denied = await access()
  if (denied) return denied
  try {
    const { samples } = await sampleManifest()
    return Response.json({
      samples: samples.map(({ id, source, durationSeconds }) => ({ id, name: source, durationSeconds })),
      configured: !!process.env.ELEVENLABS_API_KEY,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return Response.json({ error: 'ملفات العينات غير متاحة على الخادم. راجع ملفات النشر.' }, { status: 503 })
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 })
  const denied = await access()
  if (denied) return denied
  if (!process.env.ELEVENLABS_API_KEY) return Response.json({ error: 'أضف ELEVENLABS_API_KEY في إعدادات البيئة لتطبيق العينات.' }, { status: 503 })
  try {
    const length = Number(request.headers.get('content-length'))
    if (length > 4.2 * 1024 * 1024) return Response.json({ error: 'إجمالي الملفات يجب ألا يتجاوز 4MB.' }, { status: 413 })
    const form = await request.formData()
    const files = form.getAll('files').filter((file): file is File => file instanceof File)
    if (!files.length || files.length > 3 || files.reduce((sum, file) => sum + file.size, 0) > 4 * 1024 * 1024) return Response.json({ error: 'اختر من ملف إلى ثلاثة ملفات بإجمالي لا يتجاوز 4MB.' }, { status: 400 })
    return Response.json(await trainFromSamples(files), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'تعذر تطبيق العينات.',
      ...(error instanceof TrainingError ? { code: error.code, voiceId: error.voiceId } : {}),
    }, { status: error instanceof TrainingError && error.code === 'VOICE_VERIFICATION_REQUIRED' ? 409 : 502 })
  }
}
