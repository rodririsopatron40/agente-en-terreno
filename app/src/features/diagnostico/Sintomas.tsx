import { useMemo, useState } from 'react'
import type { NodoDiagnostico, Pack, Pieza, VerticalConfig } from '../../domain/types'
import { esHoja, esRama, nodoEnRuta } from '../../domain/diagnostico'
import { CriticidadBadge } from '../../ui/CriticidadBadge'
import { ProcedimientoView } from '../procedimientos/ProcedimientoView'

type Resultado = NonNullable<NodoDiagnostico['resultado']>

// Diagnostico guiado (Fase 4). Lista de sintomas agrupada por sistema -> wizard de
// una pregunta por pantalla -> pantalla de resultado (piezas culpables, procedimiento
// real de Fase 3, nota). El estado del wizard vive EN MEMORIA (useState): se descarta
// al recargar/cerrar la app, que es el comportamiento correcto.
export function Sintomas({
  pack,
  path,
  t,
  onSelectPieza,
}: {
  pack: Pack
  path: string
  t: VerticalConfig['terminologia']
  onSelectPieza: (p: Pieza) => void
}) {
  const [fallaId, setFallaId] = useState<string | null>(null)
  const [camino, setCamino] = useState<number[]>([]) // indices de opcion desde la raiz
  const [verProc, setVerProc] = useState<string | null>(null) // procedimientoId abierto

  const falla = fallaId ? (pack.fallas.find((f) => f.id === fallaId) ?? null) : null

  function elegirFalla(id: string) {
    setFallaId(id)
    setCamino([])
  }
  function reiniciar() {
    setFallaId(null)
    setCamino([])
    setVerProc(null) // reset total: no dejar un procedimiento "abierto" colgando
  }
  // Un paso atras. En la primera pregunta vuelve a la lista de sintomas. Solo quita
  // el ultimo indice del camino -> nunca deja el arbol en un estado invalido.
  function retroceder() {
    if (camino.length > 0) setCamino((c) => c.slice(0, -1))
    else reiniciar()
  }

  if (!falla) {
    return <ListaSintomas pack={pack} onElegir={elegirFalla} />
  }

  const nodo = nodoEnRuta(falla.arbol, camino)
  const proc = verProc ? pack.procedimientos.find((p) => p.id === verProc) : undefined

  return (
    <section>
      <button
        onClick={retroceder}
        className="-ml-1 mb-3 inline-flex min-h-12 items-center px-1 text-sm font-medium text-neutral-300 active:text-neutral-100"
      >
        &larr; Volver
      </button>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Diagnóstico</p>
      <h2 className="mt-0.5 text-lg font-semibold text-neutral-50">{falla.sintoma}</h2>

      {esHoja(nodo) ? (
        <ResultadoView
          resultado={nodo.resultado!}
          pack={pack}
          t={t}
          onSelectPieza={onSelectPieza}
          onVerProc={setVerProc}
          onReiniciar={reiniciar}
        />
      ) : esRama(nodo) ? (
        <Pregunta nodo={nodo} onElegir={(i) => setCamino((c) => [...c, i])} />
      ) : (
        // Nodo ni hoja ni rama: solo posible con un pack malformado (el pipeline lo
        // rechaza, pero el runtime no re-valida). Degradar sin crashear.
        <p className="mt-4 text-sm text-neutral-500">
          Este síntoma no tiene un diagnóstico cargado.
        </p>
      )}

      {proc && (
        <ProcedimientoView proc={proc} pack={pack} path={path} onClose={() => setVerProc(null)} />
      )}
    </section>
  )
}

function ListaSintomas({ pack, onElegir }: { pack: Pack; onElegir: (id: string) => void }) {
  // Agrupar por sistema, en el mismo orden que el catalogo; solo sistemas con fallas.
  const grupos = useMemo(() => {
    const bySis = new Map<string, typeof pack.fallas>()
    for (const f of pack.fallas) {
      const arr = bySis.get(f.sistemaId) ?? []
      arr.push(f)
      bySis.set(f.sistemaId, arr)
    }
    return [...pack.sistemas]
      .sort((a, b) => a.orden - b.orden)
      .map((s) => ({ sistema: s, fallas: bySis.get(s.id) ?? [] }))
      .filter((g) => g.fallas.length > 0)
  }, [pack])

  if (grupos.length === 0) {
    return <p className="text-sm text-neutral-500">No hay síntomas cargados para este equipo.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-400">Elige el síntoma que observas para diagnosticar.</p>
      {grupos.map(({ sistema, fallas }) => (
        <section key={sistema.id}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {sistema.nombre}
          </h3>
          <ul className="space-y-2">
            {fallas.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => onElegir(f.id)}
                  className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-left active:border-neutral-500"
                >
                  <span className="text-sm font-medium text-neutral-50">{f.sintoma}</span>
                  <span aria-hidden className="flex-none text-neutral-500">
                    &rsaquo;
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Pregunta({
  nodo,
  onElegir,
}: {
  nodo: NodoDiagnostico
  onElegir: (i: number) => void
}) {
  return (
    <div className="mt-4">
      <p className="text-base text-neutral-100">{nodo.pregunta}</p>
      <div className="mt-3 flex flex-col gap-2">
        {nodo.opciones!.map((op, i) => (
          // Key por indice compuesto: dos opciones podrian repetir etiqueta.
          <button
            key={`${i}-${op.etiqueta}`}
            onClick={() => onElegir(i)}
            className="min-h-14 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-left text-sm font-medium leading-snug text-neutral-100 active:border-neutral-500"
          >
            {op.etiqueta}
          </button>
        ))}
      </div>
    </div>
  )
}

function ResultadoView({
  resultado,
  pack,
  t,
  onSelectPieza,
  onVerProc,
  onReiniciar,
}: {
  resultado: Resultado
  pack: Pack
  t: VerticalConfig['terminologia']
  onSelectPieza: (p: Pieza) => void
  onVerProc: (procId: string) => void
  onReiniciar: () => void
}) {
  const piezas = resultado.piezaIds
    .map((id) => pack.piezas.find((p) => p.id === id))
    .filter((p): p is Pieza => !!p)
  const proc = pack.procedimientos.find((p) => p.id === resultado.procedimientoId)

  return (
    <div className="mt-4 flex flex-col gap-4">
      {resultado.nota && (
        <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Posible causa
          </p>
          <p className="mt-1 text-sm text-neutral-100">{resultado.nota}</p>
        </div>
      )}

      {piezas.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {t.pieza}s a revisar
          </h3>
          <ul className="space-y-2">
            {piezas.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => onSelectPieza(p)}
                  className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-left active:border-neutral-500"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-neutral-50">
                      {p.nombre}
                    </span>
                    <code className="text-xs text-neutral-400">{p.partNumber}</code>
                  </span>
                  <CriticidadBadge n={p.criticidad} label={t.criticidad[p.criticidad]} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {proc && (
        <button
          onClick={() => onVerProc(proc.id)}
          className="min-h-12 w-full rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white active:bg-emerald-700"
        >
          Ver procedimiento de reparación
        </button>
      )}

      <button
        onClick={onReiniciar}
        className="min-h-12 w-full rounded-lg border border-neutral-600 px-4 text-sm font-medium text-neutral-100 active:border-neutral-400"
      >
        Volver a empezar
      </button>
    </div>
  )
}
