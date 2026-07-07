import { useState } from 'react'
import type { Pack, Pieza, VerticalConfig } from '../../domain/types'
import { assetUrl } from '../../data/packRepo'
import { agregarAPedido } from '../../data/procedimientoRepo'
import { CriticidadBadge } from '../../ui/CriticidadBadge'
import { FotoCarrusel } from './FotoCarrusel'
import { ProcedimientoView } from '../procedimientos/ProcedimientoView'

export function PiezaDetail({
  pieza,
  pack,
  path,
  t,
  onClose,
}: {
  pieza: Pieza
  pack: Pack
  path: string
  t: VerticalConfig['terminologia']
  onClose: () => void
}) {
  const [verProc, setVerProc] = useState(false)
  const [pedidoOk, setPedidoOk] = useState(false)

  const rawFotos: { src: string; label: string }[] = [
    ...pieza.fotos.aislada.map((src) => ({ src, label: 'Pieza' })),
    ...(pieza.fotos.instalada ? [{ src: pieza.fotos.instalada, label: 'Instalada' }] : []),
    ...(pieza.fotos.desgastada ? [{ src: pieza.fotos.desgastada, label: 'Desgastada' }] : []),
  ]
  const fotos = rawFotos.map((f) => ({
    src: assetUrl(path, f.src),
    alt: `${pieza.nombre} - ${f.label}`,
    label: f.label,
  }))
  const kits = pack.kits.filter((k) => pieza.kitIds.includes(k.id))
  const aliases = pack.aliases.filter((a) => a.piezaId === pieza.id)
  const reemplaza = aliases.filter((a) => a.tipo === 'reemplazado_por')
  const otros = aliases.filter((a) => a.tipo !== 'reemplazado_por')
  // Guarda: un pack viejo cacheado en el navegador puede traer specs con la forma
  // anterior (objeto). Sin esto, un reload antes de re-importar romperia la ficha.
  const specs = Array.isArray(pieza.specs) ? pieza.specs : []
  const proc = pieza.procedimientoId
    ? pack.procedimientos.find((p) => p.id === pieza.procedimientoId)
    : undefined

  async function agregar() {
    await agregarAPedido({
      packId: pack.packId,
      tipo: 'pieza',
      refId: pieza.id,
      nombre: pieza.nombre,
      partNumber: pieza.partNumber,
    })
    setPedidoOk(true)
  }

  return (
    <section className="fixed inset-0 z-10 overflow-y-auto bg-neutral-950">
      <div className="mx-auto max-w-2xl p-5">
        <button
          onClick={onClose}
          className="-ml-1 mb-3 inline-flex min-h-12 items-center px-1 text-sm font-medium text-neutral-300 active:text-neutral-100"
        >
          &larr; Volver
        </button>
        <h2 className="text-lg font-semibold text-neutral-50">{pieza.nombre}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="rounded bg-neutral-800 px-2 py-1 text-sm text-neutral-50">
            {pieza.partNumber}
          </code>
          <CriticidadBadge n={pieza.criticidad} label={t.criticidad[pieza.criticidad]} />
        </div>

        {reemplaza.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Reemplaza a{' '}
            {reemplaza.map((a, i) => (
              <span key={a.partNumber}>
                {i > 0 && ', '}
                <code className="text-amber-100">{a.partNumber}</code>
              </span>
            ))}
            . Usa este número al pedir.
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {proc && (
            <button
              onClick={() => setVerProc(true)}
              className="min-h-12 w-full rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white active:bg-emerald-700"
            >
              Ver procedimiento de reparación
            </button>
          )}
          <button
            onClick={agregar}
            disabled={pedidoOk}
            className="min-h-12 w-full rounded-lg border border-neutral-600 px-4 text-sm font-medium text-neutral-100 disabled:opacity-60"
          >
            {pedidoOk ? 'Agregada al pedido' : 'Agregar al pedido'}
          </button>
        </div>

        {fotos.length > 0 && (
          <div className="mt-4">
            <FotoCarrusel fotos={fotos} />
          </div>
        )}

        <p className="mt-4 text-sm text-neutral-300">{pieza.descripcionVisual}</p>

        {specs.length > 0 && (
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            {specs.map((s) => (
              <div key={s.etiqueta} className="contents">
                <dt className="text-neutral-400">{s.etiqueta}</dt>
                <dd className="text-right font-medium text-neutral-100">
                  {s.valor}
                  {s.unidad ? ` ${s.unidad}` : ''}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {pieza.vidaUtilHrs != null && (
          <p className="mt-3 text-sm text-neutral-300">
            Vida útil estimada: <span className="font-medium text-neutral-100">{pieza.vidaUtilHrs} h</span>
          </p>
        )}

        {otros.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Otros números</h3>
            <ul className="mt-1 space-y-1 text-sm">
              {otros.map((a) => (
                <li key={a.partNumber} className="flex items-center justify-between gap-2">
                  <code className="text-neutral-200">{a.partNumber}</code>
                  <span className="text-xs text-neutral-400">{a.tipo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {kits.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Kits que la incluyen
            </h3>
            <ul className="mt-1 space-y-1 text-sm">
              {kits.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-2">
                  <span className="text-neutral-100">{k.nombre}</span>
                  <code className="text-xs text-neutral-300">{k.partNumber}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {verProc && proc && (
        <ProcedimientoView proc={proc} pack={pack} path={path} onClose={() => setVerProc(false)} />
      )}
    </section>
  )
}
