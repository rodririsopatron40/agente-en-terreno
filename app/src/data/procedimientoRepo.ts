import { db, type PedidoIntent } from './db'

// La logica pura del checklist vive en domain/checklist (testeable sin Dexie).
// Se reexporta para que la UI la consuma desde un solo lugar.
export { toggleMarcado, progresoResumen } from '../domain/checklist'

// --- Persistencia (Dexie) ---

export async function getProgreso(packId: string, procId: string): Promise<number[]> {
  const row = await db.progreso.get(`${packId}:${procId}`)
  return row?.marcados ?? []
}

export async function setProgreso(packId: string, procId: string, marcados: number[]): Promise<void> {
  await db.progreso.put({ id: `${packId}:${procId}`, packId, procId, marcados, updatedAt: Date.now() })
}

// Agrega un item al carrito. Idempotente: re-agregar el mismo item NO duplica
// ni reinicia su cantidad ni su antiguedad (preserva lo que el usuario ya
// ajusto en el carrito). La cantidad/envio del pedido viven en pedidoRepo.
export async function agregarAPedido(
  item: Omit<PedidoIntent, 'clave' | 'cantidad' | 'addedAt'>,
): Promise<void> {
  const clave = `${item.packId}:${item.tipo}:${item.refId}`
  const existente = await db.pedido.get(clave)
  await db.pedido.put({
    ...item,
    clave,
    cantidad: existente?.cantidad ?? 1,
    addedAt: existente?.addedAt ?? Date.now(),
  })
}

export async function contarPedido(packId: string): Promise<number> {
  return db.pedido.where('packId').equals(packId).count()
}
