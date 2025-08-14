export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { xai } from '@ai-sdk/xai'
import { generateText } from 'ai'

// Diferentes conjuntos de cuentas de X para rotar
const X_ACCOUNTS_SETS = [
  ['UVA', 'BCRAOFICIAL', 'Economia_Ar', 'AmbitoFinanciero', 'IEconTerm', 'elEconomista_es'],
  ['infobae', 'Clarin', 'lanacion', 'cronista', 'pagina12', 'tn'],
  ['MinEconomia_Ar', 'INDECArgentina', 'BancoNacion', 'BancoCentral_AR', 'afip'],
  ['dolarhoy', 'DolarBlue', 'DolarHoyNet', 'CotizacionDolar', 'DolarAlDia'],
  ['BullMarketBrok', 'InvertirOnline', 'BalanzBroker', 'ConosSur', 'PuenteNet'],
  ['byma_oficial', 'ROFEX_oficial', 'MAE_oficial', 'bolsadecereales', 'bolsacom'],
]

// Temas específicos para enfocar búsquedas según el momento
const FOCUS_TOPICS = [
  'dólar blue MEP CCL crypto',
  'inflación IPC precios canasta básica',
  'tasas BCRA plazo fijo Leliq',
  'acciones Merval ADR Wall Street',
  'soja trigo maíz exportaciones retenciones',
  'YPF Pampa Energía Galicia Macro',
  'bitcoin ethereum USDT cripto Argentina',
  'FMI deuda reservas BCRA',
  'Milei Caputo medidas económicas',
  'CEPO restricciones importaciones',
  'bonos soberanos AL30 GD30',
  'construcción inmobiliario créditos UVA',
]

// Modificadores de tiempo para el prompt
const TIME_MODIFIERS = [
  'en las últimas 2 horas',
  'hoy',
  'en este momento',
  'trending ahora',
  'breaking news',
  'últimas noticias',
  'lo más comentado',
  'viral en X',
]

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

function generateDynamicPrompt(): string {
  const timeModifier = getRandomElements(TIME_MODIFIERS, 1)[0]
  const focusTopics = getRandomElements(FOCUS_TOPICS, 3).join(', ')
  const currentHour = new Date().getHours()
  const isMarketHours = currentHour >= 11 && currentHour <= 17
  
  let contextualFocus = ''
  if (isMarketHours) {
    contextualFocus = 'Prioriza movimientos del mercado en tiempo real, cotizaciones, y reacciones inmediatas.'
  } else if (currentHour >= 6 && currentHour < 11) {
    contextualFocus = 'Enfócate en apertura de mercados, expectativas del día, y noticias overnight.'
  } else if (currentHour >= 17 && currentHour < 22) {
    contextualFocus = 'Resalta cierre de mercados, análisis del día, y proyecciones para mañana.'
  } else {
    contextualFocus = 'Busca noticias internacionales, mercados globales, y anticipos para Argentina.'
  }
  
  return `Eres un asistente para un editor de El Economista (Argentina).
Busca señales de tendencia ${timeModifier} relevantes para hombres de 20 a 60 años interesados en economía y finanzas argentinas.

${contextualFocus}

Temas prioritarios para esta búsqueda: ${focusTopics}

IMPORTANTE:
- Busca información NUEVA y FRESCA, no repitas tendencias anteriores
- Prioriza lo que está sucediendo AHORA MISMO
- Incluye rumores de mercado, tweets virales, y reacciones en tiempo real
- Mezcla noticias confirmadas con especulaciones y análisis
- Varía entre temas macro, micro, empresas, commodities y cripto

Devuelve hasta 18 tendencias ÚNICAS y ACTUALES. Cada ítem debe tener:
- title: máx 90 chars, debe ser llamativo y actual
- summary: 1-2 frases con información específica y números cuando sea posible
- score: 0-100 según qué tan "caliente" está el tema ahora
- tags: 3-6 hashtags relevantes
- sourceUrl: si existe, preferiblemente de X o medios argentinos

NO repitas información genérica. Cada tendencia debe ser específica del momento actual.`
}

// Cache simple en memoria con TTL
let lastFetchTime = 0
let cachedTrends: any[] = []
const CACHE_TTL = 60000 // 1 minuto de cache para evitar llamadas idénticas muy seguidas

export async function GET() {
  try {
    // Si hay cache válido y es muy reciente, lo mezclamos aleatoriamente
    const now = Date.now()
    if (cachedTrends.length > 0 && (now - lastFetchTime) < CACHE_TTL) {
      // Reordenamos el cache existente para dar sensación de cambio
      const shuffled = [...cachedTrends].sort(() => 0.5 - Math.random())
      return NextResponse.json({ 
        trends: shuffled.slice(0, 12), // Devolvemos menos items del cache
        cached: true 
      })
    }

    const model = xai('grok-3-latest')
    
    // Seleccionamos sets de cuentas aleatorios
    const selectedAccounts = getRandomElements(X_ACCOUNTS_SETS, 2).flat()
    const dynamicPrompt = generateDynamicPrompt()

    const { text, sources } = await generateText({
      model,
      prompt: `${dynamicPrompt}\n\nFormatea la salida estrictamente como JSON válido bajo la clave "trends" (array).`,
      providerOptions: {
        xai: {
          searchParameters: {
            mode: 'on',
            returnCitations: true,
            maxSearchResults: 50, // Aumentamos para más variedad
            recency: 'hour', // Priorizamos contenido muy reciente
            sources: [
              { 
                type: 'x', 
                xHandles: selectedAccounts,
                // Agregamos filtros adicionales para contenido fresco
              },
              { 
                type: 'news', 
                country: 'AR', 
                safeSearch: true,
                // Priorizamos noticias recientes
              },
              // Agregamos búsqueda web general para más variedad
              { 
                type: 'web',
                safeSearch: true,
              }
            ],
          },
        },
      },
    })

    // Try parse JSON block
    let parsed: any = null
    try {
      parsed = JSON.parse(text)
    } catch {
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start >= 0 && end > start) {
        parsed = JSON.parse(text.slice(start, end + 1))
      }
    }

    const trends = Array.isArray(parsed?.trends) ? parsed.trends : []

    // Normalize structure con IDs únicos basados en timestamp
    const timestamp = Date.now()
    const normalized = trends.map((t: any, idx: number) => ({
      id: `${timestamp}-${idx}`, // ID único basado en tiempo
      title: String(t.title ?? '').slice(0, 120),
      summary: String(t.summary ?? ''),
      score: Number.isFinite(t.score) ? Number(t.score) : Math.floor(Math.random() * 30 + 50), // Score aleatorio si no existe
      tags: Array.isArray(t.tags) ? t.tags.map((x: any) => String(x)) : [],
      sourceUrl: t.sourceUrl ? String(t.sourceUrl) : undefined,
      timestamp: new Date().toISOString(), // Agregamos timestamp
    }))

    // Mezclamos un poco el orden para más variación
    const shuffledNormalized = normalized.sort(() => 0.5 - Math.random())
    
    // Actualizamos cache
    cachedTrends = shuffledNormalized
    lastFetchTime = now

    return NextResponse.json({ 
      trends: shuffledNormalized, 
      sources: sources ?? [],
      searchParams: {
        accounts: selectedAccounts.slice(0, 6), // Mostramos qué cuentas se usaron
        timestamp: new Date().toISOString(),
      }
    })
  } catch (error) {
    console.error('Error fetching trends:', error)
    
    // Si hay cache antiguo, lo devolvemos mezclado
    if (cachedTrends.length > 0) {
      const shuffled = [...cachedTrends].sort(() => 0.5 - Math.random())
      return NextResponse.json({ 
        trends: shuffled.slice(0, 10), 
        fallback: true 
      })
    }
    
    return NextResponse.json({ trends: [] }, { status: 200 })
  }
}


