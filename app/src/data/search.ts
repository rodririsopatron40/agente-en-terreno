import MiniSearch from 'minisearch'
import type { Pack, Pieza } from '../domain/types'
import { normalizePartNumber } from '../domain/partNumber'

export interface PiezaDoc {
  id: string
  nombre: string
  descripcionVisual: string
  partNumberNorm: string
}

const OPTIONS = {
  fields: ['nombre', 'descripcionVisual', 'partNumberNorm'],
  storeFields: ['nombre', 'partNumberNorm'],
  idField: 'id',
}

export function buildIndex(pack: Pack): MiniSearch<PiezaDoc> {
  const ms = new MiniSearch<PiezaDoc>(OPTIONS)
  ms.addAll(
    pack.piezas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      descripcionVisual: p.descripcionVisual,
      partNumberNorm: p.partNumberNorm,
    })),
  )
  return ms
}

export function serializeIndex(ms: MiniSearch<PiezaDoc>): string {
  return JSON.stringify(ms)
}

export function loadIndex(json: string): MiniSearch<PiezaDoc> {
  return MiniSearch.loadJSON<PiezaDoc>(json, OPTIONS)
}

// Busqueda combinada (plan 5.2): primero exacto por part number normalizado
// (pieza y alias, resolviendo supersesion), luego fuzzy sobre nombre/descripcion.
// El orden primario de los resultados fuzzy es el score de MiniSearch (que ya
// resuelve casos como "sello piston" -> la de alta presion puntua mas alto que la
// de baja). El desempate criticidad desc -> partNumber asc es una GARANTIA de
// determinismo: solo actua cuando dos piezas empatan el score exacto, para que la
// misma consulta devuelva SIEMPRE la misma pieza primera. No altera el ranking
// cuando los scores difieren.
export function searchPiezas(query: string, pack: Pack, ms: MiniSearch<PiezaDoc>): Pieza[] {
  const q = query.trim()
  if (!q) return []
  const byId = new Map(pack.piezas.map((p) => [p.id, p]))
  const hits: Pieza[] = []
  const seen = new Set<string>()
  const push = (id: string) => {
    const p = byId.get(id)
    if (p && !seen.has(id)) {
      hits.push(p)
      seen.add(id)
    }
  }

  const norm = normalizePartNumber(q)
  if (norm) {
    for (const p of pack.piezas) if (p.partNumberNorm === norm) push(p.id)
    for (const a of pack.aliases) if (a.partNumberNorm === norm) push(a.piezaId)
  }

  const fuzzy = ms
    .search(q, { prefix: true, fuzzy: 0.2, combineWith: 'OR' })
    .map((r) => ({ p: byId.get(r.id as string), score: r.score }))
    .filter((x): x is { p: Pieza; score: number } => Boolean(x.p))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.p.criticidad - a.p.criticidad ||
        a.p.partNumberNorm.localeCompare(b.p.partNumberNorm),
    )
  for (const { p } of fuzzy) push(p.id)
  return hits
}
