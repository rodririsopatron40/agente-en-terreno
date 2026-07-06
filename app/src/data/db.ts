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

class TerrenoDB extends Dexie {
  packs!: Table<StoredPack, string>
  meta!: Table<MetaKV, string>

  constructor() {
    super('terreno')
    this.version(1).stores({
      packs: 'packId, version',
      meta: 'key',
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
