import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { z } from 'zod'

const TrendSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().optional().default(''),
  score: z.number().optional().default(50),
  tags: z.array(z.string()).optional().default([]),
  sourceUrl: z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = z.object({ trends: z.array(TrendSchema).min(1) }).safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { trends } = parsed.data
    const topics = trends
      .map((t) => `- ${t.title}${t.tags?.length ? ` (${t.tags.map((x) => `#${x}`).join(' ')})` : ''}${t.sourceUrl ? ` [fuente: ${t.sourceUrl}]` : ''}`)
      .join('\n')

    const system = `Eres un redactor senior de El Economista (Argentina). Escribe con rigor económico, claridad y neutralidad, evitando hype. Prioriza datos, contexto local y comparaciones con series históricas. Tono profesional, conciso, didáctico.`

    const prompt = `Genera un artículo periodístico listo para editar (900-1000 palabras) sobre uno o varios de los siguientes tópicos seleccionados por el editor. Incluye título atractivo pero sobrio, copete de 2-3 líneas, cuerpo con subtítulos, y un cierre con próximos pasos o riesgos a monitorear. Mantén enfoque en economía/finanzas y audiencia masculina 20-60. Evita inventar cifras.

Cuando existan fuentes o señales, PRIORIZA incluir datos concretos: números, porcentajes, fechas, rangos, variaciones intermensuales/interanuales, montos en ARS/USD, y referencias comparativas (p. ej., vs. promedio 5 años). Cita brevemente entre corchetes [fuente: ...] si se mencionó una URL o medio. Si faltan datos, sugiere explícitamente dónde obtenerlos (BCRA, INDEC, Hacienda, mercados, etc.).

Tópicos:\n${topics}\n\nEstructura:\n1) Título\n2) Copete\n3) Desarrollo con subtítulos (H2/H3)\n4) Cierre con escenarios y próximos pasos.\nSi hay URL de fuente, incorpórala como referencia entre corchetes al final.`

    // Previous non-streaming implementation (kept for reference)
    // const { text } = await generateText({
    //   model: openai('gpt-4o'),
    //   system,
    //   prompt,
    // })
    // return NextResponse.json({ article: text })

    const result = await streamText({
      model: openai('gpt-4.1'),
      system,
      prompt,
    })

    // Stream incremental tokens to the client as text
    return result.toTextStreamResponse()
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}


