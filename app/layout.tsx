import './globals.css'
import type { Metadata } from 'next'
import AuthGate from '@/components/AuthGate'
import ThemePicker from '@/components/ThemePicker'

export const metadata: Metadata = {
  title: 'El Economista - Tendencias & Redacción Asistida',
  description: 'Descubre tendencias y genera artículos periodísticos con ayuda de IA.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased min-h-screen">
        <div className="w-full">
          {/* Top brand bar */}
          <div className="bg-black text-white">
            <div className="max-w-6xl mx-auto px-3 h-11 flex items-center">
              <div className="flex items-center gap-1">
                <img src="/logo-eleconomista.svg" alt="El Economista" className="h-6 w-auto" />
                {/* <div className="text-cyan-300 text-[11px] leading-none font-semibold hidden md:block">DEV</div> */}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <ThemePicker />
                <div className="text-cyan-300 text-[11px] leading-none font-semibold hidden md:block">DEV</div>
              </div>
              {false && (
                <div className="flex items-center gap-6 text-sm text-zinc-300 ml-auto">
                  <span className="hidden md:inline">DETECCION DE TENDENCIAS</span>
                  <span>{new Date().toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}</span>
                  <span className="hidden sm:inline">BUE 10°C</span>
                  <button aria-label="Buscar" className="rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10">Buscar</button>
                </div>
              )}
            </div>
          </div>

          {/* Market ticker bar removed per request */}
          {false && (
            <div className="bg-zinc-900 border-b border-white/5">
              <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                <div className="flex items-center gap-2"><span className="font-semibold">Dólar</span><span className="text-zinc-400">MEP $1318.7</span><span className="text-red-400">-0.4%</span></div>
                <div className="flex items-center gap-2"><span className="font-semibold">Riesgo país</span><span className="text-zinc-400">773</span><span className="text-zinc-400">0%</span></div>
                <div className="flex items-center gap-2"><span className="font-semibold">Merval</span><span className="text-zinc-400">2287631</span><span className="text-red-400">-1%</span></div>
                <div className="flex items-center gap-2"><span className="font-semibold">Bitcoin</span><span className="text-zinc-400">US$ 123823</span><span className="text-emerald-400">3.73%</span></div>
                <div className="flex items-center gap-2"><span className="font-semibold">Ethereum</span><span className="text-zinc-400">US$ 4752</span><span className="text-emerald-400">2.73%</span></div>
                <div className="hidden lg:flex items-center gap-2 text-zinc-400">Argentina · Economía & Finanzas</div>
              </div>
            </div>
          )}

          <AuthGate>
            <div className="max-w-6xl mx-auto px-4 py-6">
              {children}
            </div>
          </AuthGate>
        </div>
      </body>
    </html>
  )
}


