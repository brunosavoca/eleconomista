'use client'

import { useEffect, useMemo, useState } from 'react'

function stripMarkdown(input: string): string {
  // Simple markdown removal for headings, lists, bold/italic, code blocks, links
  let text = input
  text = text.replace(/```[\s\S]*?```/g, '')
  text = text.replace(/^#{1,6}\s+/gm, '')
  text = text.replace(/^[-*+]\s+/gm, '')
  text = text.replace(/\*\*(.*?)\*\*/g, '$1')
  text = text.replace(/\*(.*?)\*/g, '$1')
  text = text.replace(/`([^`]*)`/g, '$1')
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)')
  return text
}

export default function DraftPage() {
  const [raw, setRaw] = useState('')
  const clean = useMemo(() => stripMarkdown(raw), [raw])

  useEffect(() => {
    // Read article from URL hash
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const decoded = hash ? decodeURIComponent(hash.slice(1)) : ''
    setRaw(decoded)
  }, [])

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Borrador</h1>
        <p className="text-sm text-muted-foreground">Este borrador se muestra sin formato Markdown, listo para copiar y editar.</p>
      </header>

      {!clean && (
        <div className="text-muted-foreground">No se encontró contenido de borrador.</div>
      )}

      {clean && (
        <article className="space-y-4 leading-7">
          {clean.split('\n').map((line, idx) => (
            <p key={idx}>{line.trim()}</p>
          ))}
        </article>
      )}
    </main>
  )
}


