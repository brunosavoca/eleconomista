'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ToolsComingSoonPage() {
  return (
    <main>
      <section className="card">
        <h1 className="text-xl font-semibold">Próximamente</h1>
        <p className="text-sm text-muted-foreground mt-2">Herramientas para interactuar con archivos PDF y Excel estarán disponibles aquí.</p>
        <div className="mt-5">
          <Link href="/">
            <Button variant="secondary">Volver al inicio</Button>
          </Link>
        </div>
      </section>
    </main>
  )
}