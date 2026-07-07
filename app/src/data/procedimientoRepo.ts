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

// Stub de pedido: guarda la intencion. El flujo real (WhatsApp/email) es fase posterior.
export async function agregarAPedido(
  item: Omit<PedidoIntent, 'clave' | 'addedAt'>,
): Promise<void> {
  await db.pedido.put({
    ...item,
    clave: `${item.packId}:${item.tipo}:${item.refId}`,
    addedAt: Date.now(),
  })
}

export async function contarPedido(packId: string): Promise<number> {
  return db.pedido.where('packId').equals(packId).count()
}
