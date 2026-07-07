import Dexie, { type Table } from 'dexie'
import type { Pack } from '../domain/types'

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

// Intencion de pedido (stub de Fase 3; el flujo real es fase posterior).
// clave = `${packId}:${tipo}:${refId}` -> re-agregar es idempotente.
export interface PedidoIntent {
  clave: string
  packId: string
  tipo: 'pieza' | 'kit'
  refId: string
  nombre: string
  partNumber: string
  addedAt: number
}

class TerrenoDB extends Dexie {
  packs!: Table<StoredPack, string>
  meta!: Table<MetaKV, string>
  progreso!: Table<ProcProgreso, string>
  pedido!: Table<PedidoIntent, string>

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
  }
}

export const db = new TerrenoDB()

export async function getActivePackId(): Promise<string | undefined> {
  return (await db.meta.get('activePackId'))?.value
}

export async function setActivePackId(packId: string): Promise<void> {
  await db.meta.put({ key: 'activePackId', value: packId })
}
