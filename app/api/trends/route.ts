export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { xai } from '@ai-sdk/xai'
import { generateText } from 'ai'

const ECON_AUDIENCE_PROMPT = `Eres un asistente para un editor de El Economista (Argentina). 
Debes buscar señales de tendencia en tiempo real relevantes para hombres de 20 a 60 años interesados en economía, finanzas, mercados, política económica, tasas, inflación, CEPO, dólar, MEP, blue, soja, exportaciones, y empresas argentinas. 
Devuelve una lista de hasta 18 tendencias CONCISAS. Cada ítem debe tener: title (máx 90 chars), summary (1-2 frases), score (0-100 según relevancia), tags (3-6 hashtags), sourceUrl (si existe). 
No inventes datos: usa Live Search y cita fuentes si están disponibles.`

export async function GET() {
  try {
    const model = xai('grok-3-latest')

    const { text, sources } = await generateText({
      model,
      prompt: `${ECON_AUDIENCE_PROMPT}\nFormatea la salida estrictamente como JSON válido bajo la clave "trends" (array).`,
      providerOptions: {
        xai: {
          searchParameters: {
            mode: 'on',
            returnCitations: true,
            maxSearchResults: 30,
            sources: [
              { type: 'x', xHandles: ['UVA', 'BCRAOFICIAL', 'Economia_Ar', 'AmbitoFinanciero', 'IEconTerm', 'elEconomista_es'] },
              { type: 'news', country: 'AR', safeSearch: true },
              // RSS sample from docs; user can add newsroom-specific later
              { type: 'rss', links: ['https://status.x.ai/feed.xml'] },
            ],
          },
        },
      },
    })

    // Try parse JSON block; if model returned plain text, attempt safe parse
    let parsed: any = null
    try {
      parsed = JSON.parse(text)
    } catch {
      // naive fallback extract between first { and last }
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start >= 0 && end > start) {
        parsed = JSON.parse(text.slice(start, end + 1))
      }
    }

    const trends = Array.isArray(parsed?.trends) ? parsed.trends : []

    // Normalize structure
    const normalized = trends.map((t: any, idx: number) => ({
      id: String(t.id ?? idx),
      title: String(t.title ?? '').slice(0, 120),
      summary: String(t.summary ?? ''),
      score: Number.isFinite(t.score) ? Number(t.score) : 50,
      tags: Array.isArray(t.tags) ? t.tags.map((x: any) => String(x)) : [],
      sourceUrl: t.sourceUrl ? String(t.sourceUrl) : undefined,
    }))

    return NextResponse.json({ trends: normalized, sources: sources ?? [] })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ trends: [] }, { status: 200 })
  }
}


