import { useEffect, useState } from 'react'
import type { Orden, Pack, Solicitante, VerticalConfig } from '../../domain/types'
import { asuntoPedido, construirMensaje, mailtoLink, waLink } from '../../domain/pedido'
import type { PedidoIntent } from '../../data/db'
import {
  crearOrden,
  eliminarOrden,
  getSolicitante,
  listCarrito,
  listOrdenes,
  marcarEnviada,
  quitarItem,
  reabrirOrden,
  setCantidadItem,
  setSolicitante,
} from '../../data/pedidoRepo'

const VACIO: Solicitante = { nombre: '', empresa: '', telefono: '' }

// Pedido (Fase Pedidos): carrito editable -> datos de contacto -> generar orden
// -> cola de envio (WhatsApp/email) -> historial. El envio se gatea con la
// conexion: sin senal la orden queda pendiente con reintento al reconectar.
export function PedidoView({
  pack,
  pedidos,
  t,
  online,
  onCambio,
}: {
  pack: Pack
  pedidos: VerticalConfig['pedidos']
  t: VerticalConfig['terminologia']
  online: boolean
  onCambio: () => void
}) {
  const [carrito, setCarrito] = useState<PedidoIntent[]>([])
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [datos, setDatos] = useState<Solicitante>(VACIO)
  const [editandoDatos, setEditandoDatos] = useState(false)

  async function recargar() {
    const [c, o] = await Promise.all([listCarrito(pack.packId), listOrdenes()])
    setCarrito(c)
    setOrdenes(o)
    onCambio()
  }

  useEffect(() => {
    void recargar()
    void getSolicitante().then((s) => {
      if (s) setDatos(s)
      else setEditandoDatos(true) // primera vez: pedir los datos
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.packId])

  async function cambiarCantidad(clave: string, cantidad: number) {
    await setCantidadItem(clave, cantidad)
    await recargar()
  }
  async function quitar(clave: string) {
    await quitarItem(clave)
    await recargar()
  }
  async function guardarDatos() {
    await setSolicitante(datos)
    setEditandoDatos(false)
  }
  async function generar() {
    await setSolicitante(datos)
    const orden = await crearOrden(pack.packId, pack.activo.nombre, datos)
    if (orden) await recargar()
  }
  async function enviar(orden: Orden, canal: 'whatsapp' | 'email') {
    const mensaje = construirMensaje(orden)
    // WhatsApp es una URL http real -> abre en pestana nueva / deep-link a la app.
    // mailto va por location.href: window.open('mailto:') deja una pestana en
    // blanco en varios navegadores (el cliente de correo abre igual). Ninguno de
    // los dos descarga la pagina, asi que los await de abajo corren igual.
    if (canal === 'whatsapp') {
      window.open(waLink(pedidos.whatsapp ?? '', mensaje), '_blank')
    } else {
      window.location.href = mailtoLink(pedidos.email ?? '', asuntoPedido(orden), mensaje)
    }
    await marcarEnviada(orden.id, canal)
    await recargar()
  }
  async function reabrir(id: string) {
    await reabrirOrden(id)
    await recargar()
  }
  async function borrar(id: string) {
    await eliminarOrden(id)
    await recargar()
  }

  const datosCompletos = datos.nombre.trim() !== '' && datos.telefono.trim() !== ''
  const puedeGenerar = carrito.length > 0 && datosCompletos
  const pendientes = ordenes.filter((o) => o.estado === 'pendiente')
  const enviadas = ordenes.filter((o) => o.estado === 'enviado')

  return (
    <div className="flex flex-col gap-6">
      {/* Carrito */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Carrito
        </h2>
        {carrito.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Aún no agregas {t.pieza.toLowerCase()}s. Usa "Agregar al pedido" en el catálogo o en un
            procedimiento.
          </p>
        ) : (
          <ul className="space-y-2">
            {carrito.map((it) => (
              <li
                key={it.clave}
                className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-50">{it.nombre}</p>
                  <code className="text-xs text-neutral-400">{it.partNumber}</code>
                </div>
                <div className="flex flex-none items-center gap-1">
                  <StepBtn
                    label="Restar uno"
                    onClick={() => cambiarCantidad(it.clave, it.cantidad - 1)}
                  >
                    &minus;
                  </StepBtn>
                  <span className="w-7 text-center text-sm font-semibold text-neutral-100">
                    {it.cantidad}
                  </span>
                  <StepBtn
                    label="Sumar uno"
                    onClick={() => cambiarCantidad(it.clave, it.cantidad + 1)}
                  >
                    +
                  </StepBtn>
                </div>
                <button
                  onClick={() => quitar(it.clave)}
                  aria-label={`Quitar ${it.nombre}`}
                  className="flex size-11 flex-none items-center justify-center rounded-lg text-neutral-500 active:text-red-400"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Datos de contacto */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Datos de contacto
          </h2>
          {!editandoDatos && datosCompletos && (
            <button
              onClick={() => setEditandoDatos(true)}
              className="text-xs font-medium text-neutral-300 active:text-neutral-100"
            >
              Editar
            </button>
          )}
        </div>
        {editandoDatos || !datosCompletos ? (
          <div className="flex flex-col gap-2">
            <Campo
              label="Nombre"
              value={datos.nombre}
              onChange={(v) => setDatos((d) => ({ ...d, nombre: v }))}
            />
            <Campo
              label={`Empresa / ${t.sitio}`}
              value={datos.empresa}
              onChange={(v) => setDatos((d) => ({ ...d, empresa: v }))}
            />
            <Campo
              label="Teléfono"
              type="tel"
              value={datos.telefono}
              onChange={(v) => setDatos((d) => ({ ...d, telefono: v }))}
            />
            <button
              onClick={guardarDatos}
              disabled={!datosCompletos}
              className="mt-1 min-h-12 rounded-lg border border-neutral-600 px-4 text-sm font-medium text-neutral-100 disabled:opacity-40"
            >
              Guardar datos
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-sm">
            <p className="font-medium text-neutral-100">{datos.nombre}</p>
            {datos.empresa && <p className="text-neutral-400">{datos.empresa}</p>}
            <p className="text-neutral-400">{datos.telefono}</p>
          </div>
        )}
      </section>

      {/* Generar */}
      <button
        onClick={generar}
        disabled={!puedeGenerar}
        className="min-h-12 w-full rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white active:bg-emerald-700 disabled:bg-neutral-800 disabled:text-neutral-500"
      >
        Generar pedido
      </button>
      {!puedeGenerar && (
        <p className="-mt-3 text-center text-xs text-neutral-500">
          {carrito.length === 0
            ? 'Agrega al menos una pieza al carrito.'
            : 'Completa nombre y teléfono para generar el pedido.'}
        </p>
      )}

      {/* Cola de envio */}
      {pendientes.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Pendientes de envío
          </h2>
          <ul className="space-y-3">
            {pendientes.map((o) => (
              <OrdenCard
                key={o.id}
                orden={o}
                online={online}
                pedidos={pedidos}
                onEnviar={enviar}
                onBorrar={borrar}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Historial */}
      {enviadas.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Enviados
          </h2>
          <ul className="space-y-2">
            {enviadas.map((o) => (
              <li
                key={o.id}
                className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-neutral-200">{o.equipoNombre}</p>
                  <p className="text-xs text-neutral-500">
                    {o.lineas.length} ítem{o.lineas.length === 1 ? '' : 's'} ·{' '}
                    {o.canal === 'whatsapp' ? 'WhatsApp' : 'Email'} · {fecha(o.sentAt ?? o.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => reabrir(o.id)}
                  className="flex-none rounded-lg border border-neutral-700 px-3 py-2 text-xs font-medium text-neutral-200 active:border-neutral-500"
                >
                  Reenviar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function OrdenCard({
  orden,
  online,
  pedidos,
  onEnviar,
  onBorrar,
}: {
  orden: Orden
  online: boolean
  pedidos: VerticalConfig['pedidos']
  onEnviar: (o: Orden, canal: 'whatsapp' | 'email') => void
  onBorrar: (id: string) => void
}) {
  return (
    <li className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-50">{orden.equipoNombre}</p>
          <p className="text-xs text-neutral-500">
            {orden.lineas.reduce((n, l) => n + l.cantidad, 0)} unidad
            {orden.lineas.reduce((n, l) => n + l.cantidad, 0) === 1 ? '' : 'es'} ·{' '}
            {orden.lineas.length} ítem{orden.lineas.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={() => onBorrar(orden.id)}
          aria-label="Descartar pedido"
          className="flex size-9 flex-none items-center justify-center rounded-lg text-neutral-500 active:text-red-400"
        >
          &times;
        </button>
      </div>

      <ul className="mt-2 space-y-0.5 text-xs text-neutral-400">
        {orden.lineas.map((l) => (
          <li key={`${l.tipo}-${l.partNumber}`} className="flex justify-between gap-2">
            <span className="truncate">
              {l.cantidad}× {l.nombre}
            </span>
            <code className="flex-none">{l.partNumber}</code>
          </li>
        ))}
      </ul>

      {!online ? (
        <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Sin conexión. El pedido queda guardado; podrás enviarlo al reconectar.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {pedidos.whatsapp && (
            <button
              onClick={() => onEnviar(orden, 'whatsapp')}
              className="min-h-12 w-full rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white active:bg-emerald-700"
            >
              Enviar por WhatsApp
            </button>
          )}
          {pedidos.email && (
            <button
              onClick={() => onEnviar(orden, 'email')}
              className="min-h-12 w-full rounded-lg border border-neutral-600 px-4 text-sm font-medium text-neutral-100 active:border-neutral-400"
            >
              Enviar por email
            </button>
          )}
        </div>
      )}
    </li>
  )
}

function StepBtn({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-lg font-semibold text-neutral-100 active:border-neutral-500"
    >
      {children}
    </button>
  )
}

function Campo({
  label,
  value,
  type = 'text',
  onChange,
}: {
  label: string
  value: string
  type?: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-neutral-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
      />
    </label>
  )
}

function fecha(ms: number): string {
  return new Date(ms).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
