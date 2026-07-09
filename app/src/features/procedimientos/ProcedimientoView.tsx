import { useEffect, useState } from 'react'
import type { Pack, Procedimiento } from '../../domain/types'
import { assetUrl } from '../../data/packRepo'
import {
  agregarAPedido,
  getProgreso,
  progresoResumen,
  setProgreso,
  toggleMarcado,
} from '../../data/procedimientoRepo'

// Flujo: pantalla de SEGURIDAD (siempre primero, no saltable) -> pasos como
// checklist persistente. Al reabrir la app se retoma el estado de los checks,
// pero la seguridad se vuelve a mostrar antes de los pasos (DoD Fase 3).
export function ProcedimientoView({
  proc,
  pack,
  path,
  onClose,
}: {
  proc: Procedimiento
  pack: Pack
  path: string
  onClose: () => void
}) {
  const [fase, setFase] = useState<'seguridad' | 'pasos'>('seguridad')
  const [marcados, setMarcados] = useState<number[]>([])
  const [pedidoOk, setPedidoOk] = useState(false)

  useEffect(() => {
    void getProgreso(pack.packId, proc.id).then(setMarcados)
  }, [pack.packId, proc.id])

  function toggle(orden: number) {
    setMarcados((prev) => {
      const next = toggleMarcado(prev, orden)
      // Persistencia fire-and-forget: no esperamos ni atrapamos el error de escritura.
      // Deuda: si esta escritura falla, el paso queda marcado en pantalla pero no en
      // Dexie (se pierde al reabrir). El fix futuro NO es revertir a `prev` del closure
      // (pisaria toggles que el usuario haya hecho despues de este); es revertir SOLO el
      // paso fallido (re-togglear ese `orden`) o releer el estado real de Dexie
      // (getProgreso) y resincronizar.
      void setProgreso(pack.packId, proc.id, next)
      return next
    })
  }

  const kit = proc.kitRecomendadoId ? pack.kits.find((k) => k.id === proc.kitRecomendadoId) : undefined
  const resumen = progresoResumen(marcados, proc.pasos.length)

  async function agregarKit() {
    if (!kit) return
    await agregarAPedido({
      packId: pack.packId,
      tipo: 'kit',
      refId: kit.id,
      nombre: kit.nombre,
      partNumber: kit.partNumber,
    })
    setPedidoOk(true)
  }

  return (
    <section className="fixed inset-0 z-20 overflow-y-auto bg-neutral-950">
      <div className="mx-auto max-w-2xl p-5">
        <button
          onClick={onClose}
          className="-ml-1 mb-3 inline-flex min-h-12 items-center px-1 text-sm font-medium text-neutral-300 active:text-neutral-100"
        >
          &larr; Volver
        </button>
        <h2 className="text-lg font-semibold text-neutral-50">{proc.titulo}</h2>

        {fase === 'seguridad' ? (
          <>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-300">
              {proc.duracionMin != null && (
                <span>
                  Duración estimada:{' '}
                  <span className="font-medium text-neutral-100">{proc.duracionMin} min</span>
                </span>
              )}
              <span>
                {proc.pasos.length} {proc.pasos.length === 1 ? 'paso' : 'pasos'}
              </span>
            </div>

            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Herramientas
              </h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-neutral-200">
                {/* Key por indice compuesto: dos herramientas podrian repetir texto. */}
                {proc.herramientas.map((h, i) => (
                  <li key={`${i}-${h}`}>{h}</li>
                ))}
              </ul>
            </div>

            {kit && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm">
                <span className="text-neutral-200">
                  Kit recomendado: <span className="font-medium text-neutral-100">{kit.nombre}</span>
                </span>
                <code className="text-xs text-neutral-400">{kit.partNumber}</code>
              </div>
            )}

            <div className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-red-200">
                <span aria-hidden>⚠</span> Seguridad, leer antes de comenzar
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-red-100">
                {/* Key por indice compuesto: dos advertencias podrian repetir texto. */}
                {proc.seguridad.map((s, i) => (
                  <li key={`${i}-${s}`} className="flex gap-2">
                    <span aria-hidden className="text-red-300">
                      •
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/*
              Gate de seguridad (obligatorio, primero, no saltable). Ademas de la
              regla de Fase 3, este gate BLINDA la carrera carga-vs-toggle: el efecto
              de montaje carga `marcados` desde Dexie de forma asincrona, y los pasos
              (unico lugar donde se togglea) solo se renderizan en fase 'pasos'. Para
              cuando el usuario cruza este gate, esa carga ya resolvio -> un toggle no
              puede ser pisado por una carga tardia. Si algun dia el gate se vuelve
              CONDICIONAL (saltable), la garantia se cae: agregar un flag `cargado` que
              difiera toggle/persistencia hasta que la carga inicial resuelva.
            */}
            <button
              onClick={() => setFase('pasos')}
              className="mt-4 min-h-12 w-full rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white active:bg-emerald-700"
            >
              He leído la seguridad, comenzar
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-neutral-400">
              Paso <span className="font-medium text-neutral-100">{resumen.hechos}</span> de{' '}
              {resumen.total}
              {resumen.completo && <span className="ml-2 text-emerald-400">Completo</span>}
            </p>

            <ol className="mt-4 space-y-3">
              {proc.pasos.map((paso) => {
                const hecho = marcados.includes(paso.orden)
                return (
                  <li key={paso.orden}>
                    <button
                      onClick={() => toggle(paso.orden)}
                      className={`flex w-full gap-3 rounded-lg border p-3 text-left ${
                        hecho
                          ? 'border-emerald-600/50 bg-emerald-500/5'
                          : 'border-neutral-700 bg-neutral-900'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-0.5 flex size-6 flex-none items-center justify-center rounded border text-xs ${
                          hecho
                            ? 'border-emerald-500 bg-emerald-500 text-neutral-950'
                            : 'border-neutral-500 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm ${
                            hecho ? 'text-neutral-400 line-through' : 'text-neutral-100'
                          }`}
                        >
                          <span className="font-semibold">{paso.orden}.</span> {paso.texto}
                        </p>
                        {paso.torqueNm != null && (
                          <span className="mt-1.5 inline-block rounded bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-200">
                            Torque {paso.torqueNm} N·m
                          </span>
                        )}
                        {paso.advertencia && (
                          <p className="mt-1.5 flex gap-1.5 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                            <span aria-hidden>⚠</span>
                            {paso.advertencia}
                          </p>
                        )}
                        {paso.foto && (
                          <img
                            src={assetUrl(path, paso.foto)}
                            alt={`Paso ${paso.orden}`}
                            className="mt-2 h-40 w-full rounded-lg border border-neutral-700 bg-neutral-900 object-contain"
                          />
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ol>

            {kit && (
              <button
                onClick={agregarKit}
                disabled={pedidoOk}
                className="mt-5 min-h-12 w-full rounded-lg border border-neutral-600 px-4 text-sm font-medium text-neutral-100 disabled:opacity-60"
              >
                {pedidoOk ? 'Kit agregado al pedido' : `Agregar ${kit.nombre} al pedido`}
              </button>
            )}
            <p className="mt-2 text-center text-xs text-neutral-500">
              El envío del pedido se habilita en una etapa posterior.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
