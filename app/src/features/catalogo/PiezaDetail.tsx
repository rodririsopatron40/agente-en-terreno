import type { Pack, Pieza, VerticalConfig } from '../../domain/types'
import { assetUrl } from '../../data/packRepo'
import { CriticidadBadge } from '../../ui/CriticidadBadge'

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
  const fotos: { src: string; label: string }[] = [
    ...pieza.fotos.aislada.map((src) => ({ src, label: 'Pieza' })),
    ...(pieza.fotos.instalada ? [{ src: pieza.fotos.instalada, label: 'Instalada' }] : []),
    ...(pieza.fotos.desgastada ? [{ src: pieza.fotos.desgastada, label: 'Desgastada' }] : []),
  ]
  const kits = pack.kits.filter((k) => pieza.kitIds.includes(k.id))
  const aliases = pack.aliases.filter((a) => a.piezaId === pieza.id)
  const reemplaza = aliases.filter((a) => a.tipo === 'reemplazado_por')
  const otros = aliases.filter((a) => a.tipo !== 'reemplazado_por')
  const specs = Object.entries(pieza.specs)

  return (
    <section className="fixed inset-0 z-10 overflow-y-auto bg-neutral-950">
      <div className="mx-auto max-w-md p-5">
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
          <CriticidadBadge n={pieza.criticidad} sitio={t.sitio} />
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
            . Usa este numero al pedir.
          </div>
        )}

        {fotos.length > 0 && (
          <div className="-mx-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2">
            {fotos.map((f) => (
              <figure key={f.src} className="w-[82%] flex-none snap-start">
                <img
                  src={assetUrl(path, f.src)}
                  alt={`${pieza.nombre} - ${f.label}`}
                  className="h-52 w-full rounded-lg border border-neutral-700 bg-neutral-900 object-contain"
                />
                <figcaption className="mt-1 text-center text-xs text-neutral-400">{f.label}</figcaption>
              </figure>
            ))}
          </div>
        )}
        {fotos.length > 1 && (
          <p className="mt-1 text-center text-xs text-neutral-500">Desliza para ver mas fotos</p>
        )}

        <p className="mt-4 text-sm text-neutral-300">{pieza.descripcionVisual}</p>

        {specs.length > 0 && (
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            {specs.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-neutral-400">{k}</dt>
                <dd className="text-right font-medium text-neutral-100">{String(v)}</dd>
              </div>
            ))}
          </dl>
        )}

        {pieza.vidaUtilHrs != null && (
          <p className="mt-3 text-sm text-neutral-300">
            Vida util estimada: <span className="font-medium text-neutral-100">{pieza.vidaUtilHrs} h</span>
          </p>
        )}

        {otros.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Otros numeros</h3>
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
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">Kits que la incluyen</h3>
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
    </section>
  )
}
