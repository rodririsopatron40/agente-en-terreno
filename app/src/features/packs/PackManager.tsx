import { useState } from 'react'
import type { StoredPack } from '../../data/db'
import type { AvailablePack, ImportProgress } from '../../data/packRepo'
import { importPack, updatePack, deletePack } from '../../data/packRepo'

export function PackManager({
  available,
  installed,
  offline,
  onChanged,
}: {
  available: AvailablePack[] | null
  installed: StoredPack[]
  offline: boolean
  onChanged: () => Promise<void>
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const installedById = new Map(installed.map((p) => [p.packId, p]))

  async function run(packId: string, fn: () => Promise<unknown>) {
    setBusy(packId)
    setError(null)
    setProgress(null)
    try {
      await fn()
      await onChanged()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
      setProgress(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      <section>
        <h3 className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Disponibles</h3>
        {!available ? (
          <p className="text-sm text-neutral-500">
            {offline ? 'Conectate para ver y descargar packs.' : 'Cargando...'}
          </p>
        ) : available.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay packs publicados.</p>
        ) : (
          <ul className="space-y-2">
            {available.map((a) => {
              const inst = installedById.get(a.packId)
              const actualizable = inst != null && inst.version < a.version
              return (
                <li key={a.packId} className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="block truncate text-sm text-neutral-100">{a.nombre}</span>
                      <span className="text-xs text-neutral-500">
                        {a.categoria} - {a.piezas} piezas - {a.sizeMb} MB
                      </span>
                    </div>
                    {!inst ? (
                      <button
                        disabled={offline || busy !== null}
                        onClick={() => run(a.packId, () => importPack(a, setProgress))}
                        className="min-h-11 flex-none rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white disabled:opacity-40"
                      >
                        {busy === a.packId ? 'Descargando...' : 'Descargar'}
                      </button>
                    ) : actualizable ? (
                      <button
                        disabled={offline || busy !== null}
                        onClick={() => run(a.packId, () => updatePack(a, setProgress))}
                        className="min-h-11 flex-none rounded-lg bg-sky-600 px-3 text-sm font-medium text-white disabled:opacity-40"
                      >
                        {busy === a.packId ? 'Actualizando...' : `Actualizar v${a.version}`}
                      </button>
                    ) : (
                      <span className="flex-none text-xs text-emerald-400">Instalado</span>
                    )}
                  </div>
                  {busy === a.packId && progress && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded bg-neutral-800">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{
                          width: progress.total
                            ? `${Math.round((progress.hechos / progress.total) * 100)}%`
                            : '0%',
                        }}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {installed.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Instalados</h3>
          <ul className="space-y-2">
            {installed.map((p) => (
              <li
                key={p.packId}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3"
              >
                <div className="min-w-0">
                  <span className="block truncate text-sm text-neutral-100">{p.nombre}</span>
                  <span className="text-xs text-neutral-500">
                    v{p.version} - {p.sizeMb} MB
                  </span>
                </div>
                <button
                  disabled={busy !== null}
                  onClick={() => run(p.packId, () => deletePack(p.packId))}
                  className="min-h-11 flex-none rounded-lg border border-neutral-700 px-3 text-sm text-neutral-300 disabled:opacity-40"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
