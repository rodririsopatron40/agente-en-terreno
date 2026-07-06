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

  for (const r of ms.search(q, { prefix: true, fuzzy: 0.2, combineWith: 'OR' })) {
    push(r.id as string)
  }
  return hits
}
