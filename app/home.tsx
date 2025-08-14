'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const [greeting, setGreeting] = useState('')
  const router = useRouter()

  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours()
      if (hour >= 5 && hour < 12) {
        return 'Buen día'
      } else if (hour >= 12 && hour < 19) {
        return 'Buenas tardes'
      } else {
        return 'Buenas noches'
      }
    }
    
    setGreeting(getGreeting())
    
    // Update greeting every minute
    const interval = setInterval(() => {
      setGreeting(getGreeting())
    }, 60000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <main className="min-h-[calc(100vh-180px)] flex flex-col items-center justify-center">
      <div className="max-w-4xl mx-auto text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          {greeting || 'Hola'}
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-12">
          ¿Qué vamos a hacer hoy?
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="card group hover:border-emerald-400/50 transition-all duration-300">
            <div className="flex flex-col items-center p-6">
              <div className="w-16 h-16 rounded-full bg-emerald-400/10 flex items-center justify-center mb-4 group-hover:bg-emerald-400/20 transition-colors">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Tendencias en X</h2>
              <p className="text-sm text-muted-foreground mb-6 text-center">
                Descubre las últimas tendencias en economía y finanzas, y genera artículos periodísticos con IA
              </p>
              <Button 
                onClick={() => router.push('/trends')}
                className="w-full"
              >
                Explorar Tendencias
              </Button>
            </div>
          </div>
          
          <div className="card group hover:border-cyan-400/50 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-cyan-400/20 text-cyan-400 text-xs font-semibold px-2 py-1 rounded-full">
              Próximamente
            </div>
            <div className="flex flex-col items-center p-6 opacity-75">
              <div className="w-16 h-16 rounded-full bg-cyan-400/10 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Documentos y Datos</h2>
              <p className="text-sm text-muted-foreground mb-6 text-center">
                Interactúa con PDFs y archivos Excel para análisis y extracción de información
              </p>
              <Button 
                disabled
                className="w-full opacity-50 cursor-not-allowed"
              >
                Próximamente
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}