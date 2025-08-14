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

 Devuelve hasta 18 tendencias ÚNICAS y ACTUALES. Cada ítem debe tener (OBLIGATORIO):
- title: máx 90 chars, debe ser llamativo y actual
- summary: 1-2 frases con información específica y números cuando sea posible
- score: 0-100 según qué tan "caliente" está el tema ahora
- tags: 3-6 hashtags relevantes
- sourceIndex: índice (1-based) que referencia UNA de las citas devueltas por Live Search (citas = arreglo de fuentes que acompaña tu respuesta). Debes elegir la mejor fuente que sustenta ese ítem. Solo 1 índice por tendencia.
- (opcional) sourceUrl: si dispones de la URL exacta de la cita elegida, puedes incluirla, pero DEBE coincidir con una de las citas.

Reglas de formato y calidad:
- No repitas información genérica. Cada tendencia debe ser específica del momento actual.
- Cada objeto debe incluir un campo sourceIndex (número entero >=1). Evita textos como "N/A".
- Formatea la salida estrictamente como JSON válido bajo la clave "trends" (array).`
}

// Datos de prueba para desarrollo local
function generateMockTrends() {
  const mockTitles = [
    'Dólar blue sube a $1350 tras nuevas restricciones',
    'BCRA sube tasa de política monetaria al 118%',
    'YPF anuncia inversión de US$5000M en Vaca Muerta',
    'Bitcoin alcanza máximo histórico en pesos argentinos',
    'Inflación de noviembre podría superar el 4%',
    'Merval opera con fuerte volatilidad por elecciones en EEUU',
    'Soja rompe los US$400 en Chicago por sequía en Brasil',
    'FMI aprueba nuevo desembolso de US$800M para Argentina',
    'Galicia y Macro lideran ganancias en el panel líder',
    'Bonos soberanos suben 3% tras anuncio del Ministro',
    'Construcción cae 15% interanual según INDEC',
    'Tesla evalúa instalación de planta de litio en Catamarca',
  ]
  
  const mockSummaries = [
    'El tipo de cambio paralelo registra nueva suba ante mayor demanda de cobertura. Operadores esperan más presión.',
    'La autoridad monetaria endurece su política ante presiones inflacionarias. Analistas debaten efectividad.',
    'La petrolera estatal confirma megainversión en shale oil. Esperan duplicar producción en 3 años.',
    'La criptomoneda marca récord en moneda local por devaluación. Inversores buscan refugio.',
    'Consultoras privadas proyectan aceleración de precios. Alimentos lideran aumentos.',
    'El índice bursátil local muestra alta sensibilidad a factores externos. Inversores cautelosos.',
    'El commodity agrícola se dispara por problemas climáticos. Argentina podría beneficiarse.',
    'El organismo internacional libera fondos del programa. Cumplimiento de metas bajo la lupa.',
    'Los bancos privados muestran mejor performance bursátil. ADRs también en alza.',
    'Los títulos públicos reaccionan positivamente a declaraciones oficiales. Riesgo país baja.',
    'El sector muestra contracción por menor obra pública. Empresarios piden medidas.',
    'La automotriz analiza oportunidades en el triángulo del litio. Podría generar 5000 empleos.',
  ]
  
  const tags = ['dolar', 'economia', 'finanzas', 'mercados', 'inflacion', 'bcra', 'inversiones', 'cripto', 'commodities', 'bonos', 'acciones', 'argentina']
  
  const selectedTitles = getRandomElements(mockTitles, 10)
  const selectedSummaries = getRandomElements(mockSummaries, 10)
  
  return selectedTitles.map((title, idx) => ({
    id: `mock-${Date.now()}-${idx}`,
    title,
    summary: selectedSummaries[idx],
    score: Math.floor(Math.random() * 40 + 50),
    tags: getRandomElements(tags, 4),
    sourceUrl: Math.random() > 0.5 ? `https://twitter.com/mock/status/${Date.now()}${idx}` : undefined,
    timestamp: new Date().toISOString(),
  }))
}

// Cache simple en memoria con TTL
let lastFetchTime = 0
let cachedTrends: any[] = []
const CACHE_TTL = 60000 // 1 minuto de cache

export async function GET() {
  try {
    // Si no hay API key, devolvemos datos de prueba en desarrollo
    if (!process.env.XAI_API_KEY) {
      console.log('No XAI_API_KEY found, returning mock data for development')
      const mockTrends = generateMockTrends()
      return NextResponse.json({ 
        trends: mockTrends,
        mock: true,
        searchParams: {
          accounts: getRandomElements(X_ACCOUNTS_SETS, 1)[0].slice(0, 6),
          timestamp: new Date().toISOString(),
        }
      })
    }

    // Si hay cache válido y es muy reciente, lo mezclamos aleatoriamente
    const now = Date.now()
    if (cachedTrends.length > 0 && (now - lastFetchTime) < CACHE_TTL) {
      const shuffled = [...cachedTrends].sort(() => 0.5 - Math.random())
      return NextResponse.json({ 
        trends: shuffled.slice(0, 12),
        cached: true,
        searchParams: {
          accounts: getRandomElements(X_ACCOUNTS_SETS, 1)[0].slice(0, 6),
          timestamp: new Date().toISOString(),
        }
      })
    }

    const model = xai('grok-3-latest')
    // Cap at 10 handles per xAI API limits
    const selectedAccounts = getRandomElements(X_ACCOUNTS_SETS, 2).flat().slice(0, 10)
    const dynamicPrompt = generateDynamicPrompt()

    const { text, sources } = await generateText({
      model,
      prompt: dynamicPrompt,
      providerOptions: {
        xai: {
          searchParameters: {
            mode: 'on',
            returnCitations: true,
            maxSearchResults: 10,
            sources: [
              { type: 'x', xHandles: selectedAccounts },
              { type: 'news', country: 'AR', safeSearch: true },
            ],
          },
        },
      },
      // Hint para forzar URLs en la salida
      maxRetries: 1,
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

    let trends = Array.isArray(parsed?.trends) ? parsed.trends : []

    // Normalize structure con IDs únicos basados en timestamp
    const timestamp = Date.now()
    const normalized = trends
      .map((t: any, idx: number) => ({
      id: `${timestamp}-${idx}`,
      title: String(t.title ?? '').slice(0, 120),
      summary: String(t.summary ?? ''),
      score: Number.isFinite(t.score) ? Number(t.score) : Math.floor(Math.random() * 30 + 50),
      tags: Array.isArray(t.tags) ? t.tags.map((x: any) => String(x)) : [],
        // Preferir mapeo por índice de cita si está presente
        sourceUrl: (() => {
          const idxFromModel = Number(t.sourceIndex)
          if (Number.isInteger(idxFromModel) && idxFromModel >= 1 && Array.isArray(sources) && sources.length >= idxFromModel) {
            const s = (sources as any[])[idxFromModel - 1]
            if (s?.sourceType === 'url' && typeof s?.url === 'string') return s.url as string
          }
          const url = t.sourceUrl ? String(t.sourceUrl) : undefined
          return url && /^https?:\/\//i.test(url) ? url : undefined
        })(),
      timestamp: new Date().toISOString(),
    }))

    // Filtramos cualquier ítem que aún no tenga URL válida
    const withValidSource = normalized.filter((t: any) => typeof t.sourceUrl === 'string' && /^https?:\/\//i.test(t.sourceUrl))
    // Mezclamos un poco el orden para más variación
    const shuffledNormalized = withValidSource.sort(() => 0.5 - Math.random())
    
    // Actualizamos cache
    cachedTrends = shuffledNormalized
    lastFetchTime = now

    return NextResponse.json({ 
      trends: shuffledNormalized, 
      sources: sources ?? [],
      searchParams: {
        accounts: selectedAccounts.slice(0, 6),
        timestamp: new Date().toISOString(),
      }
    })
  } catch (error) {
    console.error('Error fetching trends:', error)
    
    // En caso de error, devolvemos datos de prueba
    const mockTrends = generateMockTrends()
    return NextResponse.json({ 
      trends: mockTrends,
      fallback: true,
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
      searchParams: {
        accounts: getRandomElements(X_ACCOUNTS_SETS, 1)[0].slice(0, 6),
        timestamp: new Date().toISOString(),
      }
    })
  }
}


