'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AudioLines, Bot, ChevronLeft, Mic2, Settings, SlidersHorizontal, Sparkles } from 'lucide-react'

const links = [
  { href: '/', label: 'المحادثة', icon: AudioLines },
  { href: '/training', label: 'استوديو التدريب', icon: Mic2 },
  { href: '/personality', label: 'الشخصية', icon: SlidersHorizontal },
  { href: '/voices', label: 'هوية الصوت', icon: Sparkles },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter()
  if (pathname === '/login') return children
  return <div className="min-h-screen bg-background text-foreground" dir="rtl">
    <aside className="fixed inset-y-0 right-0 hidden w-64 flex-col border-l border-border/70 bg-card/60 p-5 backdrop-blur-xl lg:flex">
      <Link href="/" className="mb-10 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground"><Bot /></span><span><b className="block text-sm">ADHAM VOICE AI</b><small className="text-muted-foreground">وكيلك الصوتي الشخصي</small></span></Link>
      <nav className="flex flex-col gap-2">{links.map(({href,label,icon:Icon}) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${pathname===href?'bg-primary/12 text-primary':'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}><Icon className="size-4" />{label}</Link>)}</nav>
      <div className="mt-auto rounded-2xl border border-primary/20 bg-primary/5 p-4"><p className="text-xs text-muted-foreground">الهوية الصوتية</p><p className="mt-1 text-sm font-medium">إسنا، الأقصر</p><span className="mt-3 inline-flex items-center gap-2 text-xs text-primary"><i className="size-1.5 rounded-full bg-primary"/>خاص وآمن</span></div>
      <button onClick={async()=>{await fetch('/api/auth',{method:'DELETE'});router.push('/login')}} className="mt-3 flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4"/>تسجيل الخروج</button>
    </aside>
    <main className="min-h-screen pb-24 lg:mr-64 lg:pb-0">{children}</main>
    <nav className="fixed inset-x-3 bottom-3 flex justify-around rounded-2xl border border-border bg-card/95 p-2 shadow-2xl backdrop-blur lg:hidden">{links.map(({href,label,icon:Icon}) => <Link key={href} href={href} aria-label={label} className={`rounded-xl p-3 ${pathname===href?'bg-primary text-primary-foreground':'text-muted-foreground'}`}><Icon className="size-5"/></Link>)}</nav>
  </div>
}
