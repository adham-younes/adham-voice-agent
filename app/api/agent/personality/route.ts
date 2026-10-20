import { NextResponse } from 'next/server'
import { z } from 'zod'
import { updateAgentPrompt } from '@/lib/elevenlabs/agent'

const schema = z.object({ prompt: z.string().min(80).max(12000) })

export async function PUT(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'تعليمات الشخصية يجب أن تكون بين 80 و12000 حرف.' }, { status: 400 })
  try {
    return NextResponse.json(await updateAgentPrompt(parsed.data.prompt))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'تعذر تحديث الشخصية.' }, { status: 502 })
  }
}
