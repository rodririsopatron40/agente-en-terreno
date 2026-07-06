import { db, setActivePackId, getActivePackId, type StoredPack } from './db'
import { cacheAssetVerified, deleteCached } from './assetCache'
import { buildIndex, loadIndex, serializeIndex, type PiezaDoc } from './search'
import { planAssetDelta } from '../domain/packDelta'
import type { Pack } from '../domain/types'
import type MiniSearch from 'minisearch'

const BASE = import.meta.env.BASE_URL

export interface AvailablePack {
  packId: string
  path: string
  nombre: string
  categoria: string
  version: number
  piezas: number
  sizeMb: number
}

export interface ImportProgress {
  hechos: number
  total: number
}

export interface ActivePack {
  stored: StoredPack
  pack: Pack
  ms: MiniSearch<PiezaDoc>
}

export function assetUrl(path: string, ruta: string): string {
  return `${BASE}packs/${path}/${ruta}`
}

export async function listAvailable(): Promise<AvailablePack[]> {
  const res = await fetch(`${BASE}packs/index.json`)
  if (!res.ok) throw new Error(`No hay catalogo de packs disponibles (HTTP ${res.status})`)
  return (await res.json()) as AvailablePack[]
}

export async function listInstalled(): Promise<StoredPack[]> {
  return db.packs.toArray()
}

export async function importPack(
  avail: AvailablePack,
  onProgress?: (p: ImportProgress) => void,
): Promise<StoredPack> {
  const pack = await fetchPack(avail.path)
  const total = pack.assets.length
  let hechos = 0
  for (const a of pack.assets) {
    await cacheAssetVerified(assetUrl(avail.path, a.ruta), a.hash)
    onProgress?.({ hechos: ++hechos, total })
  }
  const stored = toStored(avail, pack)
  await db.packs.put(stored)
  await setActivePackId(stored.packId)
  return stored
}

export async function updatePack(
  avail: AvailablePack,
  onProgress?: (p: ImportProgress) => void,
): Promise<StoredPack> {
  const existing = await db.packs.get(avail.packId)
  if (!existing) return importPack(avail, onProgress)
  const pack = await fetchPack(avail.path)
  const { refetch, remove } = planAssetDelta(existing.pack.assets, pack.assets)
  let hechos = 0
  for (const a of refetch) {
    await cacheAssetVerified(assetUrl(avail.path, a.ruta), a.hash)
    onProgress?.({ hechos: ++hechos, total: refetch.length })
  }
  if (remove.length) await deleteCached(remove.map((a) => assetUrl(avail.path, a.ruta)))
  const stored = toStored(avail, pack)
  await db.packs.put(stored)
  return stored
}

export async function deletePack(packId: string): Promise<void> {
  const stored = await db.packs.get(packId)
  if (!stored) return
  await deleteCached(stored.pack.assets.map((a) => assetUrl(stored.path, a.ruta)))
  await db.packs.delete(packId)
  if ((await getActivePackId()) === packId) await db.meta.delete('activePackId')
}

export async function loadActivePack(): Promise<ActivePack | null> {
  // Si el id activo quedo stale (pack borrado), cae al primer pack instalado.
  const activeId = await getActivePackId()
  const stored =
    (activeId ? await db.packs.get(activeId) : undefined) ??
    (await db.packs.toCollection().first())
  if (!stored) return null
  return { stored, pack: stored.pack, ms: loadIndex(stored.searchIndex) }
}

async function fetchPack(path: string): Promise<Pack> {
  const res = await fetch(assetUrl(path, 'pack.json'), { cache: 'no-store' })
  if (!res.ok) throw new Error(`No se pudo descargar el pack (HTTP ${res.status})`)
  const pack = (await res.json()) as Pack
  guardPack(pack)
  return pack
}

function toStored(avail: AvailablePack, pack: Pack): StoredPack {
  return {
    packId: pack.packId,
    path: avail.path,
    version: pack.version,
    nombre: avail.nombre,
    sizeMb: avail.sizeMb,
    importedAt: Date.now(),
    pack,
    searchIndex: serializeIndex(buildIndex(pack)),
  }
}

// Guarda liviana de forma. La validacion de schema autoritativa vive en el
// pipeline de contenido (tools/validate-pack); aqui solo un sanity check porque
// el pack viene de nuestra propia fuente. La integridad real de los binarios la
// da la verificacion de hash en cacheAssetVerified.
function guardPack(p: Pack): void {
  const ok =
    p &&
    p.packId &&
    typeof p.version === 'number' &&
    p.activo &&
    p.activo.id &&
    Array.isArray(p.sistemas) &&
    Array.isArray(p.piezas) &&
    Array.isArray(p.assets)
  if (!ok) throw new Error('pack.json invalido: estructura inesperada')
}
