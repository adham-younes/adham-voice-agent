import type { Metadata, Viewport } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/app-shell'
const cairo=Cairo({subsets:['arabic','latin'],variable:'--font-cairo'})
export const metadata:Metadata={title:'ADHAM VOICE AI',description:'وكيل صوتي شخصي بالمصري والصعيدي، مدعوم من Groq وElevenLabs.',robots:{index:false,follow:false}}
export const viewport:Viewport={themeColor:'#07110d',colorScheme:'dark',width:'device-width',initialScale:1}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl" className="dark"><body className={cairo.variable}><AppShell>{children}</AppShell></body></html>}
