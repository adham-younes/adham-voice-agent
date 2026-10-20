import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/login' || pathname === '/api/auth' || pathname.startsWith('/_next') || pathname.includes('.')) return NextResponse.next()
  const token = request.cookies.get('adham_session')?.value
  if (token) {
    try { await jwtVerify(token, new TextEncoder().encode(process.env.ADMIN_PASSWORD || 'configuration-missing')); return NextResponse.next() } catch {}
  }
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  return NextResponse.redirect(new URL('/login', request.url))
}
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] }
