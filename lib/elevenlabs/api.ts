const BASE = 'https://api.elevenlabs.io/v1'
export async function eleven(path: string, init?: RequestInit) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('ELEVENLABS_NOT_CONFIGURED')
  const response = await fetch(`${BASE}${path}`, { ...init, headers: { 'xi-api-key': key, 'Content-Type': 'application/json', ...init?.headers }, cache: 'no-store' })
  if (!response.ok) {
    const details = await response.text()
    const message = response.status === 401 ? 'مفتاح ElevenLabs غير صالح.' : response.status === 403 ? 'الخطة أو الصلاحيات لا تسمح بهذه العملية.' : response.status === 429 ? 'تم تجاوز حد ElevenLabs، حاول لاحقًا.' : `تعذر تنفيذ عملية ElevenLabs (${response.status}): ${details.slice(0, 500)}`
    throw new Error(message)
  }
  return response.json()
}
