import { useEffect, useState } from 'react'
import type { Pieza, VerticalConfig } from './domain/types'
import {
  applyBranding,
  listVerticales,
  loadVerticalConfig,
  type VerticalListItem,
} from './data/verticalConfig'
import type { StoredPack } from './data/db'
import {
  listAvailable,
  listInstalled,
  loadActivePack,
  type AvailablePack,
  type ActivePack,
} from './data/packRepo'
import { OnlineBadge } from './ui/OnlineBadge'
import { PackManager } from './features/packs/PackManager'
import { Catalogo } from './features/catalogo/Catalogo'
import { PiezaDetail } from './features/catalogo/PiezaDetail'
import { Sintomas } from './features/diagnostico/Sintomas'

const STORAGE_KEY = 'vertical-activo'
const DEFAULT_VERTICAL = 'mineria-cl'

type Vista = 'packs' | 'catalogo' | 'sintomas'

function App() {
  // Vertical / white-label (Fase 0)
  const [verticales, setVerticales] = useState<VerticalListItem[]>([])
  const [config, setConfig] = useState<VerticalConfig | null>(null)
  const [verticalId, setVerticalId] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? DEFAULT_VERTICAL,
  )
  const [error, setError] = useState<string | null>(null)

  // Packs / offline (Fase 1)
  const [installed, setInstalled] = useState<StoredPack[]>([])
  const [active, setActive] = useState<ActivePack | null>(null)
  const [available, setAvailable] = useState<AvailablePack[] | null>(null)
  const [vista, setVista] = useState<Vista>('packs')
  const [pieza, setPieza] = useState<Pieza | null>(null)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    listVerticales()
      .then((lista) => {
        setVerticales(lista)
        if (lista.length > 0 && !lista.some((v) => v.id === verticalId)) {
          const fb = lista.some((v) => v.id === DEFAULT_VERTICAL) ? DEFAULT_VERTICAL : lista[0].id
          localStorage.setItem(STORAGE_KEY, fb)
          setVerticalId(fb)
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

  useEffect(() => {
    void refreshPacks().then((act) => setVista(act ? 'catalogo' : 'packs'))
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // Catalogo de packs disponibles (solo con conexion; requiere red para descargar)
  useEffect(() => {
    if (vista === 'packs' && online) {
      listAvailable()
        .then(setAvailable)
        .catch(() => setAvailable(null))
    }
  }, [vista, online])

  async function refreshPacks(): Promise<ActivePack | null> {
    const [inst, act] = await Promise.all([listInstalled(), loadActivePack()])
    setInstalled(inst)
    setActive(act)
    return act
  }

  function cambiarVertical(id: string) {
    localStorage.setItem(STORAGE_KEY, id)
    setVerticalId(id)
  }

  if (error) return <Msg>{`Error: ${error}`}</Msg>
  if (!config) return <Msg>Cargando...</Msg>

  const t = config.terminologia
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-[5] flex items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold" style={{ color: 'var(--color-primario)' }}>
            {config.nombre}
          </h1>
          <p className="truncate text-xs text-neutral-500">{config.pedidos.nombreDistribuidor}</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <OnlineBadge />
          <select
            value={verticalId}
            onChange={(e) => cambiarVertical(e.target.value)}
            className="rounded border border-neutral-700 bg-neutral-900 px-1.5 py-1 text-xs text-neutral-200"
            aria-label="Vertical"
          >
            {verticales.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        </div>
      </header>

      <nav className="flex gap-1 border-b border-neutral-800 px-4">
        <Tab activo={vista === 'catalogo'} disabled={!active} onClick={() => setVista('catalogo')}>
          Catálogo
        </Tab>
        <Tab activo={vista === 'sintomas'} disabled={!active} onClick={() => setVista('sintomas')}>
          Síntomas
        </Tab>
        <Tab activo={vista === 'packs'} onClick={() => setVista('packs')}>
          Packs
        </Tab>
      </nav>

      <div className="flex-1 p-4">
        {vista === 'packs' ? (
          <PackManager
            available={available}
            installed={installed}
            offline={!online}
            onChanged={async () => {
              const act = await refreshPacks()
              if (act) setVista('catalogo')
            }}
          />
        ) : !active ? (
          <p className="text-sm text-neutral-500">
            Descarga un {t.activo.toLowerCase()} en la pestaña Packs para empezar.
          </p>
        ) : vista === 'catalogo' ? (
          <Catalogo pack={active.pack} ms={active.ms} t={t} onSelect={setPieza} />
        ) : (
          <Sintomas
            pack={active.pack}
            path={active.stored.path}
            t={t}
            onSelectPieza={setPieza}
          />
        )}
      </div>

      {pieza && active && (
        <PiezaDetail
          pieza={pieza}
          pack={active.pack}
          path={active.stored.path}
          t={t}
          onClose={() => setPieza(null)}
        />
      )}
    </main>
  )
}

function Tab({
  activo,
  disabled,
  onClick,
  children,
}: {
  activo: boolean
  disabled?: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`min-h-12 border-b-2 px-4 text-sm font-medium disabled:opacity-30 ${
        activo ? 'text-neutral-100' : 'border-transparent text-neutral-400'
      }`}
      style={activo ? { borderColor: 'var(--color-acento)' } : undefined}
    >
      {children}
    </button>
  )
}

function Msg({ children }: { children: string }) {
  return (
    <main className="grid min-h-svh place-items-center p-6 text-sm text-neutral-400">{children}</main>
  )
}

export default App
