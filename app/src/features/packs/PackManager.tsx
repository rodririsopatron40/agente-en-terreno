import { useState } from 'react'
import type { StoredPack } from '../../data/db'
import type { AvailablePack, ImportProgress } from '../../data/packRepo'
import { importPack, updatePack, deletePack } from '../../data/packRepo'
import { ClaveInvalidaError, clearAccessKey, getAccessKey, setAccessKey } from '../../data/accessKey'

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
  // Pack esperando clave: se abre la pantalla de "Clave de acceso" antes de bajarlo.
  const [pidiendoClave, setPidiendoClave] = useState<AvailablePack | null>(null)
  const installedById = new Map(installed.map((p) => [p.packId, p]))

  // `reintentoPack`: si la accion falla por clave incorrecta, ese es el pack cuya
  // clave se vuelve a pedir. En borrar no aplica (no toca la funcion protegida).
  async function run(packId: string, fn: () => Promise<unknown>, reintentoPack?: AvailablePack) {
    setBusy(packId)
    setError(null)
    setProgress(null)
    try {
      await fn()
      await onChanged()
    } catch (e) {
      if (e instanceof ClaveInvalidaError && reintentoPack) {
        // Clave incorrecta: la descartamos y volvemos a pedirla, sin pistas.
        clearAccessKey()
        setError('Clave incorrecta. Verifica e intenta de nuevo.')
        setPidiendoClave(reintentoPack)
      } else {
        setError(String(e))
      }
    } finally {
      setBusy(null)
      setProgress(null)
    }
  }

  // Descargar/actualizar un pack protegido exige clave: si no hay una guardada,
  // primero se pide. Los packs libres (mock) bajan directo.
  function pedir(a: AvailablePack, accion: (a: AvailablePack) => Promise<unknown>) {
    if (a.protegido && !getAccessKey()) {
      setError(null)
      setPidiendoClave(a)
      return
    }
    void run(a.packId, () => accion(a), a)
  }

  function confirmarClave(clave: string) {
    const a = pidiendoClave
    if (!a) return
    setAccessKey(clave)
    setPidiendoClave(null)
    const yaInstalado = installedById.has(a.packId)
    void run(a.packId, () => (yaInstalado ? updatePack(a, setProgress) : importPack(a, setProgress)), a)
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      <section>
        <h3 className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Disponibles</h3>
        {!available ? (
          <p className="text-sm text-neutral-500">
            {offline ? 'Conéctate para ver y descargar packs.' : 'Cargando...'}
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
                      <span className="flex items-center gap-1.5 truncate text-sm text-neutral-100">
                        {a.nombre}
                        {a.protegido && (
                          <span aria-label="Protegido" title="Requiere clave de acceso">
                            🔒
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {a.categoria} - {a.piezas} piezas - {a.sizeMb} MB
                      </span>
                    </div>
                    {!inst ? (
                      <button
                        disabled={offline || busy !== null}
                        onClick={() => pedir(a, (x) => importPack(x, setProgress))}
                        className="min-h-11 flex-none rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white disabled:opacity-40"
                      >
                        {busy === a.packId ? 'Descargando...' : 'Descargar'}
                      </button>
                    ) : actualizable ? (
                      <button
                        disabled={offline || busy !== null}
                        onClick={() => pedir(a, (x) => updatePack(x, setProgress))}
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

      {pidiendoClave && (
        <ClaveModal
          pack={pidiendoClave}
          onCancelar={() => setPidiendoClave(null)}
          onConfirmar={confirmarClave}
        />
      )}
    </div>
  )
}

function ClaveModal({
  pack,
  onCancelar,
  onConfirmar,
}: {
  pack: AvailablePack
  onCancelar: () => void
  onConfirmar: (clave: string) => void
}) {
  const [clave, setClave] = useState('')
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-5">
      <div className="w-full max-w-sm rounded-xl border border-neutral-700 bg-neutral-900 p-5">
        <h3 className="text-base font-semibold text-neutral-50">Clave de acceso</h3>
        <p className="mt-1 text-sm text-neutral-400">
          "{pack.nombre}" es contenido protegido. Ingresa la clave para descargarlo.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (clave.trim()) onConfirmar(clave)
          }}
        >
          <input
            autoFocus
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Clave"
            className="mt-4 min-h-12 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
          />
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onCancelar}
              className="min-h-12 flex-1 rounded-lg border border-neutral-700 px-4 text-sm font-medium text-neutral-200 active:border-neutral-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!clave.trim()}
              className="min-h-12 flex-1 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white active:bg-emerald-700 disabled:opacity-40"
            >
              Descargar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
