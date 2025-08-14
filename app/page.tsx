'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type Trend = {
  id: string
  title: string
  summary: string
  sourceUrl?: string
  score: number
  tags: string[]
}

function stripMarkdown(input: string): string {
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// function plainToParagraphHtml(text: string): string {
//   const lines = text.split('\n').map(line => line.trim())
//   const blocks = lines.map(l => l.length ? `<p>${escapeHtml(l)}</p>` : '<p>&nbsp;</p>')
//   return blocks.join('')
// }

export default function HomePage() {
  const [trends, setTrends] = useState<Trend[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [article, setArticle] = useState<string>('')
  const [hasSearched, setHasSearched] = useState(false)
  const draftRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [copied, setCopied] = useState(false)
  // const [editorContent, setEditorContent] = useState<string>('')
  const progressSteps = useMemo(
    () => [
      'Preparando tópicos seleccionados',
      'Construyendo prompt periodístico',
      'Consultando el modelo',
      'Analizando respuesta',
      'Formateando borrador',
    ],
    []
  )
  const [progressIndex, setProgressIndex] = useState(0)
  
  // Old auto-fetch on mount (kept for reference, disabled per request to manually trigger search)
  // useEffect(() => {
  //   fetchTrends()
  // }, [])

  const fetchTrends = async () => {
    setHasSearched(true)
    setLoading(true)
    try {
      const res = await fetch('/api/trends', { cache: 'no-store' })
      if (!res.ok) throw new Error('Error fetching trends')
      const data = await res.json()
      setTrends(data.trends as Trend[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const selectedTrends = useMemo(
    () => trends.filter(t => selectedIds.has(t.id)),
    [trends, selectedIds]
  )

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const generateArticles = async () => {
    setGenerating(true)
    setArticle('')
    // setEditorContent('')
    setProgressIndex(0)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trends: selectedTrends }),
      })
      if (!res.ok || !res.body) throw new Error('Error generating article')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let buffer = ''
      const stripChunk = (s: string) =>
        s
          .replace(/```[\s\S]*?```/g, '')
          .replace(/\*\*/g, '')
          .replace(/`/g, '')
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/^[-*+]\s+/gm, '')
          .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)')
      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk
          setArticle((prev) => prev + stripChunk(chunk))
        }
      }
      // Final pass to clean up any leftover markdown artifacts
      setArticle(stripMarkdown(buffer))
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    if (article && draftRef.current) {
      draftRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [article])

  useEffect(() => {
    if (!generating) return
    setProgressIndex(0)
    const interval = window.setInterval(() => {
      setProgressIndex((i) => (i < progressSteps.length - 1 ? i + 1 : i))
    }, 900)
    return () => window.clearInterval(interval)
  }, [generating, progressSteps.length])

  return (
    <main>
      <section className="mb-8">
        <div className="card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold leading-tight">Descubrir tendencias en X</h2>
            <p className="text-sm text-muted-foreground mt-1">Economía y finanzas · Argentina · masculino 20–60</p>
          </div>
          <Button onClick={fetchTrends} className="h-11 px-6 text-base">
            {loading ? 'Buscando…' : 'Buscar tendencias en X'}
          </Button>
        </div>
      </section>
      <section className="mb-6">
        <div className="flex items-center gap-3">
          <button
            className="btn-muted"
            onClick={() => {
              setSelectedIds(new Set())
              setArticle('')
            }}
          >
            Limpiar selección
          </button>
          <button
            className="btn-primary disabled:opacity-50"
            disabled={selectedIds.size === 0 || generating}
            onClick={generateArticles}
          >
            {generating ? 'Generando…' : 'Generar artículo'}
          </button>
          <div className="ml-auto text-sm text-muted-foreground">
            {selectedIds.size} seleccionados
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && (
          <div className="col-span-full text-muted-foreground">Cargando tendencias…</div>
        )}
        {!loading && trends.length === 0 && hasSearched && (
          <div className="col-span-full text-muted-foreground">Sin resultados por ahora.</div>
        )}
        {!loading && trends.length === 0 && !hasSearched && (
          <div className="col-span-full text-muted-foreground">Haz clic en “Buscar tendencias en X” para comenzar.</div>
        )}
        {trends.map((t) => (
          <article key={t.id} className={`card group ${selectedIds.has(t.id) ? 'ring-2 ring-accent' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold leading-tight pr-2">{t.title}</h3>
              <button
                className={`badge ${selectedIds.has(t.id) ? 'bg-accent text-accent-foreground' : ''}`}
                onClick={() => toggleSelect(t.id)}
              >
                {selectedIds.has(t.id) ? 'Seleccionado' : 'Elegir'}
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-4">{t.summary}</p>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-2">
                {t.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="badge">#{tag}</span>
                ))}
              </div>
              {t.sourceUrl && (
                <a className="text-xs text-accent hover:underline" href={t.sourceUrl} target="_blank" rel="noreferrer">Fuente</a>
              )}
            </div>
          </article>
        ))}
      </section>

      {article && (
        <section ref={draftRef} className="mt-8 card">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Borrador generado</h2>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  if (navigator?.clipboard?.writeText) {
                    await navigator.clipboard.writeText(article)
                  } else {
                    const el = textareaRef.current
                    if (el) {
                      el.select()
                      el.setSelectionRange(0, el.value.length)
                      document.execCommand('copy')
                    }
                  }
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1500)
                } catch {
                  // noop
                }
              }}
              className="h-9 px-3 text-sm"
              aria-label="Copiar borrador al portapapeles"
            >
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <textarea
            ref={textareaRef}
            value={article}
            onChange={(e) => setArticle(e.target.value)}
            className="w-full min-h-[520px] resize-y rounded-md border border-white/10 bg-zinc-900/60 text-zinc-100 p-4 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-inner"
            spellCheck={false}
          />
        </section>
      )}

      {generating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass rounded-xl p-6 w-[min(680px,92vw)]">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
              <div>
                <div className="font-semibold">Generando borrador…</div>
                <div className="text-sm text-muted-foreground">{selectedIds.size} tendencias seleccionadas</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full bg-white/10 rounded">
                <div
                  className="h-2 bg-emerald-400 rounded transition-all"
                  style={{ width: `${((progressIndex + 1) / progressSteps.length) * 100}%` }}
                />
              </div>
              <ul className="mt-3 text-sm text-zinc-300 space-y-1">
                {progressSteps.map((s, i) => (
                  <li key={s} className={i <= progressIndex ? 'text-white' : 'text-zinc-400'}>
                    {i < progressIndex ? '✓ ' : i === progressIndex ? '⟳ ' : '• '} {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}


