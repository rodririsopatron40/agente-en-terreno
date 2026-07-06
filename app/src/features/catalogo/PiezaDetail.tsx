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
  const fotos = [pieza.fotos.instalada, ...pieza.fotos.aislada, pieza.fotos.desgastada].filter(
    (f): f is string => Boolean(f),
  )
  const kits = pack.kits.filter((k) => pieza.kitIds.includes(k.id))
  const aliases = pack.aliases.filter((a) => a.piezaId === pieza.id)
  const specs = Object.entries(pieza.specs)

  return (
    <section className="fixed inset-0 z-10 overflow-y-auto bg-neutral-950">
      <div className="mx-auto max-w-md p-5">
        <button onClick={onClose} className="mb-4 min-h-11 text-sm text-neutral-400">
          &larr; Volver
        </button>
        <h2 className="text-lg font-semibold text-neutral-100">{pieza.nombre}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="rounded bg-neutral-800 px-2 py-1 text-sm text-neutral-100">
            {pieza.partNumber}
          </code>
          <CriticidadBadge n={pieza.criticidad} sitio={t.sitio} />
        </div>

        {fotos.length > 0 && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {fotos.map((f) => (
              <img
                key={f}
                src={assetUrl(path, f)}
                alt={pieza.nombre}
                className="h-44 w-auto flex-none rounded-lg border border-neutral-800 bg-neutral-900"
              />
            ))}
          </div>
        )}

        <p className="mt-4 text-sm text-neutral-400">{pieza.descripcionVisual}</p>

        {specs.length > 0 && (
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            {specs.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-neutral-500">{k}</dt>
                <dd className="text-right text-neutral-200">{String(v)}</dd>
              </div>
            ))}
          </dl>
        )}

        {pieza.vidaUtilHrs != null && (
          <p className="mt-3 text-sm text-neutral-400">
            Vida util estimada: <span className="text-neutral-200">{pieza.vidaUtilHrs} h</span>
          </p>
        )}

        {aliases.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">Otros numeros</h3>
            <ul className="mt-1 space-y-1 text-sm">
              {aliases.map((a) => (
                <li key={a.partNumber} className="flex items-center justify-between gap-2">
                  <code className="text-neutral-300">{a.partNumber}</code>
                  <span
                    className={
                      a.tipo === 'reemplazado_por' ? 'text-xs text-amber-300' : 'text-xs text-neutral-500'
                    }
                  >
                    {a.tipo === 'reemplazado_por' ? `reemplazado por ${pieza.partNumber}` : a.tipo}
                  </span>
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
                  <span className="text-neutral-200">{k.nombre}</span>
                  <code className="text-xs text-neutral-400">{k.partNumber}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
