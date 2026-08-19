import Dexie, { type Table } from 'dexie'
import type { Orden, Pack } from '../domain/types'

// Un pack importado se guarda como un unico registro (el JSON estructurado es
// pequeno aun para catalogos grandes; las imagenes van a Cache Storage aparte).
export interface StoredPack {
  packId: string
  path: string // carpeta bajo /packs/ (para reconstruir URLs de assets)
  version: number
  nombre: string
  sizeMb: number
  importedAt: number
  pack: Pack
  searchIndex: string // MiniSearch serializado
}

export interface MetaKV {
  key: string
  value: string
}

// Progreso de un procedimiento: que pasos (por 'orden') estan marcados. Persiste
// para retomar si la app se cierra a mitad. id = `${packId}:${procId}`.
export interface ProcProgreso {
  id: string
  packId: string
  procId: string
  marcados: number[]
  updatedAt: number
}

// Item del carrito. clave = `${packId}:${tipo}:${refId}` -> re-agregar es
// idempotente (no duplica ni reinicia la cantidad). `cantidad` es editable en
// el carrito; filas viejas (v2, sin el campo) se leen como cantidad 1.
export interface PedidoIntent {
  clave: string
  packId: string
  tipo: 'pieza' | 'kit'
  refId: string
  nombre: string
  partNumber: string
  cantidad: number
  addedAt: number
}

class TerrenoDB extends Dexie {
  packs!: Table<StoredPack, string>
  meta!: Table<MetaKV, string>
  progreso!: Table<ProcProgreso, string>
  pedido!: Table<PedidoIntent, string>
  ordenes!: Table<Orden, string>

  constructor() {
    super('terreno')
    this.version(1).stores({
      packs: 'packId, version',
      meta: 'key',
    })
    // v2: checklist de procedimientos + intenciones de pedido (Fase 3).
    this.version(2).stores({
      packs: 'packId, version',
      meta: 'key',
      progreso: 'id, packId',
      pedido: 'clave, packId',
    })
    // v3: ordenes generadas (cola de envio + historial). `cantidad` se agrega a
    // `pedido` sin cambiar su indice -> las filas v2 no necesitan migracion (se
    // leen con default 1). Solo la tabla nueva justifica el bump de version.
    this.version(3).stores({
      packs: 'packId, version',
      meta: 'key',
      progreso: 'id, packId',
      pedido: 'clave, packId',
      ordenes: 'id, estado, createdAt',
    })
  }
}

export const db = new TerrenoDB()

export async function getActivePackId(): Promise<string | undefined> {
  return (await db.meta.get('activePackId'))?.value
}

export async function setActivePackId(packId: string): Promise<void> {
  await db.meta.put({ key: 'activePackId', value: packId })
}
