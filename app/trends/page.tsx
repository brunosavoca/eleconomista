'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type Trend = {
  id: string
  title: string
  summary: string
  sourceUrl?: string
  score: number
  tags: string[]
  timestamp?: string
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
  const router = useRouter()
  const [trends, setTrends] = useState<Trend[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [article, setArticle] = useState<string>('')
  const [hasSearched, setHasSearched] = useState(false)
  const [searchInfo, setSearchInfo] = useState<{accounts?: string[], timestamp?: string, cached?: boolean}>({})
  const [lastSearchTime, setLastSearchTime] = useState<Date | null>(null)
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
    setSelectedIds(new Set()) // Limpiar selección al buscar nuevas tendencias
    try {
      const res = await fetch('/api/trends', { cache: 'no-store' })
      if (!res.ok) throw new Error('Error fetching trends')
      const data = await res.json()
      setTrends(data.trends as Trend[])
      setSearchInfo({
        accounts: data.searchParams?.accounts,
        timestamp: data.searchParams?.timestamp,
        cached: data.cached || false
      })
      setLastSearchTime(new Date())
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
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Volver al inicio</span>
        </button>
      </div>
      
      <section className="mb-8">
        <div className="card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold leading-tight">Descubrir tendencias en X</h2>
            <p className="text-sm text-muted-foreground mt-1">Economía y finanzas · Argentina · masculino 20–60</p>
            {lastSearchTime && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${searchInfo.cached ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></span>
                Última búsqueda: {lastSearchTime.toLocaleTimeString('es-AR')}
                {searchInfo.cached && ' (caché)'}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button onClick={fetchTrends} className="h-11 px-6 text-base" disabled={loading}>
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Buscando…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Buscar tendencias en X
                </>
              )}
            </Button>
            {searchInfo.accounts && searchInfo.accounts.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Fuentes: @{searchInfo.accounts.slice(0, 3).join(', @')}...
              </p>
            )}
          </div>
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
          <>
            <div className="col-span-full flex items-center gap-3 p-3 rounded-md bg-card border border-border">
              <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <div className="font-medium text-foreground">Buscando tendencias en X…</div>
              <div className="ml-auto text-xs text-muted-foreground">economía · finanzas · AR</div>
            </div>

            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-5 w-3/4 rounded bg-muted" />
                  <div className="h-6 w-20 rounded bg-accent/20" />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-11/12 rounded bg-muted" />
                  <div className="h-4 w-10/12 rounded bg-muted" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    <div className="h-6 w-16 rounded bg-muted" />
                    <div className="h-6 w-14 rounded bg-muted" />
                    <div className="h-6 w-12 rounded bg-muted" />
                  </div>
                  <div className="h-4 w-14 rounded bg-muted" />
                </div>
              </div>
            ))}
          </>
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
              <div className="flex-1">
                <h3 className="font-semibold leading-tight pr-2">{t.title}</h3>
                {t.score >= 80 && (
                  <div className="inline-flex items-center gap-1 mt-1">
                    <span className="text-xs font-medium text-orange-500">🔥 Trending</span>
                  </div>
                )}
              </div>
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
              <div className="flex items-center gap-2">
                {t.score >= 70 && (
                  <div className="flex gap-0.5">
                    {[...Array(Math.min(3, Math.floor(t.score / 30)))].map((_, i) => (
                      <span key={i} className="text-xs text-orange-400">●</span>
                    ))}
                  </div>
                )}
                {t.sourceUrl && (
                  <a className="text-xs text-accent hover:underline" href={t.sourceUrl} target="_blank" rel="noreferrer">Fuente</a>
                )}
              </div>
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
            className="w-full min-h-[520px] resize-y rounded-md border border-border bg-card text-foreground p-4 focus:outline-none focus:ring-2 focus:ring-accent shadow-inner"
            spellCheck={false}
          />
        </section>
      )}

      {generating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass rounded-xl p-6 w-[min(680px,92vw)]">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <div>
                <div className="font-semibold">Generando borrador…</div>
                <div className="text-sm text-muted-foreground">{selectedIds.size} tendencias seleccionadas</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full bg-muted rounded">
                <div
                  className="h-2 bg-accent rounded transition-all"
                  style={{ width: `${((progressIndex + 1) / progressSteps.length) * 100}%` }}
                />
              </div>
              <ul className="mt-3 text-sm text-muted-foreground space-y-1">
                {progressSteps.map((s, i) => (
                  <li key={s} className={i <= progressIndex ? 'text-foreground' : 'text-muted-foreground'}>
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


