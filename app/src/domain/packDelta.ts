import type { AssetManifest } from './types'

// Logica pura de actualizacion delta por hash: que assets re-descargar y cuales
// borrar al pasar de una version de pack a otra. Testeable sin navegador.
export interface AssetDelta {
  refetch: AssetManifest[] // cambiaron de hash o son nuevos
  remove: AssetManifest[] // ya no estan en la version nueva
}

export function planAssetDelta(
  oldAssets: AssetManifest[],
  newAssets: AssetManifest[],
): AssetDelta {
  const oldByRuta = new Map(oldAssets.map((a) => [a.ruta, a.hash]))
  const newByRuta = new Map(newAssets.map((a) => [a.ruta, a.hash]))
  return {
    refetch: newAssets.filter((a) => oldByRuta.get(a.ruta) !== a.hash),
    remove: oldAssets.filter((a) => !newByRuta.has(a.ruta)),
  }
}
