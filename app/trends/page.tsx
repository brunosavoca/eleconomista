'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type Trend = {
  id: string
  title: string
  summary: string
  sourceUrl?: string
  sourceUser?: string
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
  const [serverStats, setServerStats] = useState<{sourcesCount?: number, trendCount?: number, selectedAccountsCount?: number, sourceTypeCounters?: Record<string, number>, timings?: any} | undefined>(undefined)
  const [lastSearchTime, setLastSearchTime] = useState<Date | null>(null)
  const [serverMessage, setServerMessage] = useState<string | undefined>(undefined)
  const draftRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const revealTimerRef = useRef<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [visibleCount, setVisibleCount] = useState(0)
  const [searchDuration, setSearchDuration] = useState<number | null>(null)
  // const [editorContent, setEditorContent] = useState<string>('')
  const loadingSteps = useMemo(
    () => [
      'Armando un prompt dinámico con foco horario y temas prioritarios…',
      'Activando Live Search en X y medios locales para recolectar señales…',
      'Analizando resultados y extrayendo tendencias únicas y actuales…',
      'Validando citas y URLs de fuente para cada tendencia…',
      'Puntuando, ordenando y preparando tarjetas para mostrar…',
      'Listo. Renderizando resultados…',
    ],
    []
  )
  const [topbarProgress, setTopbarProgress] = useState(0)
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
    setServerMessage(undefined)
    // Reiniciar render progresivo
    if (revealTimerRef.current) {
      window.clearInterval(revealTimerRef.current)
      revealTimerRef.current = null
    }
    setVisibleCount(0)
    setTopbarProgress(12)
    try {
      const t0 = performance.now()
      setTopbarProgress(18)
      const res = await fetch('/api/trends', { cache: 'no-store' })
      if (!res.ok) throw new Error('Error fetching trends')
      setTopbarProgress(48)
      const data = await res.json()
      setTopbarProgress(66)
      setTrends(data.trends as Trend[])
      // Iniciar render progresivo de tarjetas
      const total = Array.isArray(data.trends) ? data.trends.length : 0
      if (total > 0) {
        const INITIAL_RENDER_COUNT = 6
        const CHUNK_SIZE = 6
        const CHUNK_DELAY_MS = 160
        setVisibleCount(Math.min(INITIAL_RENDER_COUNT, total))
        if (revealTimerRef.current) {
          window.clearInterval(revealTimerRef.current)
        }
        const id = window.setInterval(() => {
          setVisibleCount((c) => {
            if (c >= total) {
              window.clearInterval(id)
              revealTimerRef.current = null
              return c
            }
            const next = Math.min(c + CHUNK_SIZE, total)
            if (next >= total) {
              window.clearInterval(id)
              revealTimerRef.current = null
            }
            return next
          })
        }, CHUNK_DELAY_MS)
        revealTimerRef.current = id
      }
      setTopbarProgress(82)
      const t1 = performance.now()
      const duration = Math.round(t1 - t0)
      setSearchDuration(duration)
      console.log('[trends] network+parse ms:', duration)
      if (typeof data.message === 'string' && data.message.trim().length > 0) {
        setServerMessage(data.message)
      }
      if (data.stats) {
        setServerStats(data.stats)
      } else {
        setServerStats(undefined)
      }
      setSearchInfo({
        accounts: data.searchParams?.accounts,
        timestamp: data.searchParams?.timestamp,
        cached: data.cached || false
      })
      setLastSearchTime(new Date())
    } catch (err) {
      console.error(err)
      setServerMessage('No hay datos disponibles por el momento. Intenta nuevamente en unos segundos.')
    } finally {
      setLoading(false)
      setTopbarProgress(100)
      const t2 = performance.now()
      console.log('[trends] total fetch->ready ms:', Math.round(t2))
    }
  }

  // Limpiar temporizador en unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current) {
        window.clearInterval(revealTimerRef.current)
        revealTimerRef.current = null
      }
    }
  }, [])

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

  // Derive current loading step from topbarProgress
  const currentLoadingStep = useMemo(() => {
    if (!loading) return ''
    const bucket = Math.floor((topbarProgress || 0) / (100 / loadingSteps.length))
    const idx = Math.min(loadingSteps.length - 1, Math.max(0, bucket))
    return `Paso ${idx + 1}/${loadingSteps.length}: ${loadingSteps[idx]}`
  }, [loading, topbarProgress, loadingSteps])

  // Simulate top loading bar progress
  useEffect(() => {
    if (!loading) {
      setTopbarProgress(100)
      const timeout = window.setTimeout(() => setTopbarProgress(0), 300)
      return () => window.clearTimeout(timeout)
    }
    setTopbarProgress(8)
    const id = window.setInterval(() => {
      setTopbarProgress((p) => {
        if (p >= 90) return p
        const increment = Math.random() * 12
        return Math.min(p + increment, 90)
      })
    }, 350)
    return () => window.clearInterval(id)
  }, [loading])

  return (
    <main>
      {loading && (
        <div className="loading-topbar">
          <div className="bar" style={{ width: `${topbarProgress}%`, transition: 'width 300ms ease' }} />
        </div>
      )}
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

      <section className="@container grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 gap-4 perspective-distant">
        {loading && (
          <>
            <div className="col-span-full flex items-center gap-3 p-3 rounded-md bg-gradient-to-r from-card to-card/80 border border-border backdrop-blur-sm">
              <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin bg-gradient-to-r from-accent/20 to-transparent" />
              <div className="font-medium text-foreground">{currentLoadingStep}</div>
              <div className="ml-auto text-xs text-muted-foreground flex items-center gap-3">
                <span>economía · finanzas · AR</span>
                {serverStats?.selectedAccountsCount != null && (
                  <span>{serverStats.selectedAccountsCount} cuentas</span>
                )}
                {serverStats?.sourcesCount != null && serverStats.sourcesCount > 0 && (
                  <span>{serverStats.sourcesCount} fuentes</span>
                )}
              </div>
            </div>

            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="h-5 w-3/4 skeleton" />
                  <div className="h-6 w-20 skeleton" />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-full skeleton" />
                  <div className="h-4 w-11/12 skeleton" />
                  <div className="h-4 w-10/12 skeleton" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    <div className="h-6 w-16 skeleton" />
                    <div className="h-6 w-14 skeleton" />
                    <div className="h-6 w-12 skeleton" />
                  </div>
                  <div className="h-4 w-14 skeleton" />
                </div>
              </div>
            ))}
          </>
        )}
        {!loading && trends.length === 0 && hasSearched && (
          <div className="col-span-full text-muted-foreground" aria-live="polite">
            {serverMessage || 'No hay datos disponibles por el momento.'}
          </div>
        )}
        {!loading && trends.length === 0 && !hasSearched && (
          <div className="col-span-full text-muted-foreground">Haz clic en "Buscar tendencias en X" para comenzar.</div>
        )}
        {!loading && trends.length > 0 && searchDuration && (
          <div className="col-span-full flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {searchInfo.cached ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-500"></span>
                  Resultados del caché · {trends.length} tendencias encontradas
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                  {trends.length} tendencias encontradas en {(searchDuration / 1000).toFixed(1)}s
                  {serverStats?.timings?.generateTextMs && (
                    <span className="text-xs opacity-60">
                      · IA: {(serverStats.timings.generateTextMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </span>
              )}
            </div>
            {serverStats?.sourcesCount != null && serverStats.sourcesCount > 0 && (
              <div className="text-xs text-muted-foreground">
                {serverStats.sourcesCount} fuentes consultadas
              </div>
            )}
          </div>
        )}
        {!loading && trends.length > 0 && visibleCount < trends.length && (
          <div className="col-span-full text-xs text-muted-foreground" aria-live="polite">
            Mostrando {visibleCount} de {trends.length} resultados…
          </div>
        )}
        {trends.slice(0, visibleCount || trends.length).map((t, idx) => (
          <article
            key={t.id}
            className={`card card-enter group relative cursor-pointer select-none transform-3d transition-all hover:rotate-x-2 hover:-rotate-y-3 hover:scale-105 ${selectedIds.has(t.id) ? 'ring-2 ring-accent/60' : ''}`}
            style={{ 
              animationDelay: `${idx * 40}ms`,
              background: t.score >= 85 ? 
                `linear-gradient(135deg in oklch, color-mix(in oklch, var(--card) 95%, transparent), color-mix(in oklch, var(--card) 90%, orange 5%))` : 
                undefined
            }}
            onClick={() => toggleSelect(t.id)}
            role="button"
            aria-pressed={selectedIds.has(t.id)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleSelect(t.id)
              }
            }}
          >
            {selectedIds.has(t.id) && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 pointer-events-none" />
            )}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold leading-tight pr-2">{t.title}</h3>
                {t.score >= 80 && (
                  <div className="inline-flex items-center gap-1 mt-1">
                    <span className="text-xs font-medium bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">🔥 Trending</span>
                  </div>
                )}
              </div>
              <button
                className={`badge ${selectedIds.has(t.id) ? 'bg-accent text-accent-foreground' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleSelect(t.id) }}
              >
                {selectedIds.has(t.id) ? 'Seleccionado' : 'Elegir'}
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-4">{t.summary}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex gap-2 flex-wrap flex-1 min-w-0">
                {t.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="badge">#{tag}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {t.score >= 70 && (
                  <div className="flex gap-0.5">
                    {[...Array(Math.min(3, Math.floor(t.score / 30)))].map((_, i) => (
                      <span key={i} className="text-xs bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">●</span>
                    ))}
                  </div>
                )}
                {/* Show source type icon */}
                {t.sourceUrl && (
                  t.sourceUser ? (
                    // X/Twitter source - show X logo
                    <svg className="w-3 h-3 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24" aria-label="Fuente: X">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  ) : (
                    // News/Web source - show globe icon
                    <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Fuente: Web">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  )
                )}
                {t.sourceUser && (
                  <span className="text-xs text-muted-foreground">{t.sourceUser}</span>
                )}
                {t.sourceUrl && (
                  <a className="text-xs text-accent hover:underline whitespace-nowrap" href={t.sourceUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Fuente</a>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>

      {article && (
        <>
          <div className="my-12 border-t border-border/50"></div>
          <section ref={draftRef} className="mt-8 bg-card/50 rounded-xl border-2 border-accent/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Borrador generado</h2>
              <p className="text-sm text-muted-foreground mt-1">Artículo basado en las tendencias seleccionadas</p>
            </div>
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
            className="w-full min-h-[520px] resize-y rounded-lg border border-border/50 bg-background/50 text-foreground p-4 focus:outline-none focus:ring-2 focus:ring-accent font-mono text-sm leading-relaxed"
            spellCheck={false}
          />
        </section>
        </>
      )}

      {generating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="liquid-glass rounded-2xl p-8 w-[min(680px,92vw)] shadow-2xl">
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


