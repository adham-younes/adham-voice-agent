import { NextResponse } from 'next/server'
import { z } from 'zod'
import { clearSession, createSession } from '@/lib/auth/session'
import { timingSafeEqual } from 'node:crypto'

export async function POST(request: Request) {
  const body = z.object({ password: z.string().min(1).max(256) }).safeParse(await request.json().catch(() => ({})))
  const expected = process.env.ADMIN_PASSWORD
  if (!body.success || !expected) return NextResponse.json({ error: 'بيانات الدخول غير صحيحة أو كلمة المرور غير مضبوطة.' }, { status: 401 })
  const a = Buffer.from(body.data.password), b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: 'كلمة المرور غير صحيحة.' }, { status: 401 })
  await createSession()
  return NextResponse.json({ ok: true })
}
export async function DELETE() { await clearSession(); return NextResponse.json({ ok: true }) }
