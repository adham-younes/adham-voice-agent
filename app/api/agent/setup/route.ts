import { NextResponse } from 'next/server'
import { z } from 'zod'
import { configureAgent } from '@/lib/elevenlabs/agent'

const bodySchema = z.object({ voiceId: z.string().min(1).max(100).optional() })

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'معرّف الصوت غير صالح.' }, { status: 400 })
  try {
    return NextResponse.json(await configureAgent(parsed.data.voiceId))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر إعداد الوكيل.' }, { status: 502 })
  }
}
