'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

function getGreetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return 'Buen día'
  if (hour >= 12 && hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function LandingPage() {
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const now = new Date()
    setGreeting(getGreetingForHour(now.getHours()))
  }, [])

  return (
    <main>
      <section className="card">
        <h1 className="text-2xl font-semibold">{greeting}, ¿qué vamos a hacer hoy?</h1>
        <p className="text-sm text-muted-foreground mt-2">Elige una opción para comenzar.</p>
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <Link href="/trends">
            <Button className="h-11 px-6 text-base">Explorar tendencias</Button>
          </Link>
          <Link href="/tools">
            <Button variant="secondary" className="h-11 px-6 text-base">Coming soon: PDFs y Excel</Button>
          </Link>
        </div>
      </section>
    </main>
  )
}


