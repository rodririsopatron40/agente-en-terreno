import type { Orden, OrdenLinea, Solicitante } from '../domain/types'
import { clampCantidad } from '../domain/pedido'
import { db, type PedidoIntent } from './db'

// Repo del pedido (Dexie): carrito (reusa la tabla `pedido` de los stubs de
// Fase 3), datos del solicitante (meta KV) y ordenes generadas (cola/historial).

const SOLICITANTE_KEY = 'solicitante'

// --- Carrito ---

export async function listCarrito(packId: string): Promise<PedidoIntent[]> {
  const items = await db.pedido.where('packId').equals(packId).toArray()
  // Orden estable por antiguedad para que la lista no salte al re-render.
  return items.sort((a, b) => a.addedAt - b.addedAt)
}

export async function setCantidadItem(clave: string, cantidad: number): Promise<void> {
  await db.pedido.update(clave, { cantidad: clampCantidad(cantidad) })
}

export async function quitarItem(clave: string): Promise<void> {
  await db.pedido.delete(clave)
}

export async function vaciarCarrito(packId: string): Promise<void> {
  await db.pedido.where('packId').equals(packId).delete()
}

// --- Solicitante (persistido, se pide una vez) ---

export async function getSolicitante(): Promise<Solicitante | null> {
  const row = await db.meta.get(SOLICITANTE_KEY)
  if (!row) return null
  try {
    return JSON.parse(row.value) as Solicitante
  } catch {
    return null
  }
}

export async function setSolicitante(s: Solicitante): Promise<void> {
  await db.meta.put({ key: SOLICITANTE_KEY, value: JSON.stringify(s) })
}

// --- Ordenes (cola de envio + historial) ---

// Toma el carrito del pack, lo congela en una orden 'pendiente' y VACIA el
// carrito. La orden guarda un snapshot: aunque el pack cambie/se borre, el
// texto del pedido queda intacto.
export async function crearOrden(
  packId: string,
  equipoNombre: string,
  solicitante: Solicitante,
): Promise<Orden | null> {
  const carrito = await listCarrito(packId)
  if (carrito.length === 0) return null

  const lineas: OrdenLinea[] = carrito.map((i) => ({
    tipo: i.tipo,
    nombre: i.nombre,
    partNumber: i.partNumber,
    cantidad: clampCantidad(i.cantidad),
  }))
  const createdAt = Date.now()
  const orden: Orden = {
    id: `${packId}:${createdAt}`,
    packId,
    equipoNombre,
    lineas,
    solicitante,
    estado: 'pendiente',
    createdAt,
  }
  await db.ordenes.put(orden)
  await vaciarCarrito(packId)
  return orden
}

export async function listOrdenes(): Promise<Orden[]> {
  const todas = await db.ordenes.toArray()
  // Mas nuevas primero.
  return todas.sort((a, b) => b.createdAt - a.createdAt)
}

export async function marcarEnviada(id: string, canal: 'whatsapp' | 'email'): Promise<void> {
  await db.ordenes.update(id, { estado: 'enviado', canal, sentAt: Date.now() })
}

export async function reabrirOrden(id: string): Promise<void> {
  await db.ordenes.update(id, { estado: 'pendiente', canal: undefined, sentAt: undefined })
}

export async function eliminarOrden(id: string): Promise<void> {
  await db.ordenes.delete(id)
}
