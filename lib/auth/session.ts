import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE = 'adham_session'
const secret = () => new TextEncoder().encode(process.env.ADMIN_PASSWORD || 'configuration-missing')

export async function createSession() {
  const token = await new SignJWT({ role: 'owner' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(secret())
  const store = await cookies()
  store.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 604800 })
}

export async function clearSession() { (await cookies()).delete(COOKIE) }
export async function isAuthenticated() {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return false
  try { await jwtVerify(token, secret()); return true } catch { return false }
}
export async function requireAuth() { if (!(await isAuthenticated())) throw new Error('UNAUTHORIZED') }
