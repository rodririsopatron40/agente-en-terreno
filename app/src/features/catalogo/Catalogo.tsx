import { useMemo, useState } from 'react'
import type MiniSearch from 'minisearch'
import type { Pack, Pieza, VerticalConfig } from '../../domain/types'
import type { PiezaDoc } from '../../data/search'
import { searchPiezas } from '../../data/search'
import { normalizePartNumber } from '../../domain/partNumber'
import { CriticidadBadge } from '../../ui/CriticidadBadge'

export function Catalogo({
  pack,
  ms,
  t,
  onSelect,
}: {
  pack: Pack
  ms: MiniSearch<PiezaDoc>
  t: VerticalConfig['terminologia']
  onSelect: (p: Pieza) => void
}) {
  const [q, setQ] = useState('')
  const resultados = useMemo(() => (q.trim() ? searchPiezas(q, pack, ms) : null), [q, pack, ms])
  // Supersesion visible: si lo buscado es un numero antiguo (reemplazado_por),
  // avisamos cual es el numero vigente antes de la lista.
  const superseso = useMemo(() => {
    const norm = normalizePartNumber(q)
    if (!norm) return null
    const a = pack.aliases.find((x) => x.tipo === 'reemplazado_por' && x.partNumberNorm === norm)
    if (!a) return null
    const vigente = pack.piezas.find((p) => p.id === a.piezaId)
    return vigente ? { antiguo: a.partNumber, vigente } : null
  }, [q, pack])
  const grupos = useMemo(() => {
    const bySis = new Map<string, Pieza[]>()
    for (const p of pack.piezas) {
      const arr = bySis.get(p.sistemaId) ?? []
      arr.push(p)
      bySis.set(p.sistemaId, arr)
    }
    return [...pack.sistemas]
      .sort((a, b) => a.orden - b.orden)
      .map((s) => ({
        sistema: s,
        piezas: (bySis.get(s.id) ?? []).sort((a, b) => b.criticidad - a.criticidad),
      }))
  }, [pack])

  return (
    <div className="flex flex-col gap-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Buscar ${t.pieza.toLowerCase()} o numero de parte`}
        className="min-h-12 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-base text-neutral-100 placeholder:text-neutral-500"
        inputMode="search"
        autoCorrect="off"
        autoCapitalize="off"
      />
      {superseso && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <code className="text-amber-100">{superseso.antiguo}</code> es un numero antiguo.
          Reemplazado por <code className="text-amber-100">{superseso.vigente.partNumber}</code>.
        </div>
      )}
      {resultados ? (
        <PiezaList piezas={resultados} t={t} onSelect={onSelect} vacio="Sin coincidencias" />
      ) : (
        grupos.map(({ sistema, piezas }) => (
          <section key={sistema.id}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {sistema.nombre}
            </h3>
            <PiezaList piezas={piezas} t={t} onSelect={onSelect} />
          </section>
        ))
      )}
    </div>
  )
}

function PiezaList({
  piezas,
  t,
  onSelect,
  vacio,
}: {
  piezas: Pieza[]
  t: VerticalConfig['terminologia']
  onSelect: (p: Pieza) => void
  vacio?: string
}) {
  if (piezas.length === 0) {
    return <p className="text-sm text-neutral-500">{vacio ?? 'Sin elementos'}</p>
  }
  return (
    <ul className="space-y-2">
      {piezas.map((p) => (
        <li key={p.id}>
          <button
            onClick={() => onSelect(p)}
            className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-left active:border-neutral-500"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-neutral-50">{p.nombre}</span>
              <code className="text-xs text-neutral-400">{p.partNumber}</code>
            </span>
            <CriticidadBadge n={p.criticidad} sitio={t.sitio} />
          </button>
        </li>
      ))}
    </ul>
  )
}
