import { useEffect, useState } from 'react'
import type { VerticalConfig } from './domain/types'
import {
  applyBranding,
  listVerticales,
  loadVerticalConfig,
  type VerticalListItem,
} from './data/verticalConfig'

const STORAGE_KEY = 'vertical-activo'
const DEFAULT_VERTICAL = 'mineria-cl'

function App() {
  const [verticales, setVerticales] = useState<VerticalListItem[]>([])
  const [config, setConfig] = useState<VerticalConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verticalId, setVerticalId] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? DEFAULT_VERTICAL,
  )

  useEffect(() => {
    // Solo al montar: valida el id inicial (puede venir stale de localStorage).
    listVerticales()
      .then((lista) => {
        setVerticales(lista)
        if (lista.length > 0 && !lista.some((v) => v.id === verticalId)) {
          const fallback = lista.some((v) => v.id === DEFAULT_VERTICAL)
            ? DEFAULT_VERTICAL
            : lista[0].id
          cambiarVertical(fallback)
        }
      })
      .catch((e: unknown) => setError(String(e)))
  }, [])

  useEffect(() => {
    let vivo = true
    loadVerticalConfig(verticalId)
      .then((cfg) => {
        if (!vivo) return
        applyBranding(cfg)
        setConfig(cfg)
        setError(null)
      })
      .catch((e: unknown) => {
        if (vivo) setError(String(e))
      })
    return () => {
      vivo = false
    }
  }, [verticalId])

  function cambiarVertical(id: string) {
    localStorage.setItem(STORAGE_KEY, id)
    setVerticalId(id)
  }

  if (error) {
    return (
      <main className="grid min-h-svh place-items-center p-6 text-red-400">
        <p>Error: {error}</p>
      </main>
    )
  }
  if (!config) {
    return (
      <main className="grid min-h-svh place-items-center p-6 text-neutral-400">
        <p>Cargando...</p>
      </main>
    )
  }

  const t = config.terminologia
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 bg-neutral-950 p-6 text-neutral-100">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primario)' }}>
            {config.nombre}
          </h1>
          <p className="text-sm text-neutral-400">{config.pedidos.nombreDistribuidor}</p>
        </div>
        <label className="text-xs text-neutral-400">
          Vertical
          <select
            className="mt-1 block rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
            value={verticalId}
            onChange={(e) => cambiarVertical(e.target.value)}
          >
            {verticales.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="rounded-xl border border-neutral-800 p-4">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-neutral-500">
          Terminologia del rubro
        </h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Term k="activo" v={t.activo} />
          <Term k="sitio" v={t.sitio} />
          <Term k="sistema" v={t.sistema} />
          <Term k="pieza" v={t.pieza} />
          <Term k="falla" v={t.falla} />
        </dl>
      </section>

      <section
        className="rounded-xl border p-4 text-sm"
        style={{ borderColor: 'var(--color-acento)' }}
      >
        Prueba de branding: los colores{' '}
        <span style={{ color: 'var(--color-primario)' }}>primario</span> y{' '}
        <span style={{ color: 'var(--color-acento)' }}>acento</span> vienen del config, sin tocar
        codigo.
      </section>

      <footer className="mt-auto text-xs text-neutral-600">
        Fase 0 - contratos + scaffold - plataforma de contenido (sin dominio hardcodeado)
      </footer>
    </main>
  )
}

function Term({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-neutral-500">{k}</dt>
      <dd className="text-right text-neutral-100">{v}</dd>
    </>
  )
}

export default App
