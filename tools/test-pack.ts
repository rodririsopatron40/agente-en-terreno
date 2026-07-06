// Test de logica pura (sin navegador): busqueda y delta de assets sobre el mock.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildIndex, searchPiezas } from '../app/src/data/search'
import { planAssetDelta } from '../app/src/domain/packDelta'
import type { Pack } from '../app/src/domain/types'

const here = dirname(fileURLToPath(import.meta.url))
const pack = JSON.parse(
  readFileSync(join(here, '../app/public/packs/hidromax-bx40/pack.json'), 'utf8'),
) as Pack

let fallas = 0
function check(nombre: string, cond: boolean) {
  console.log(`${cond ? 'ok  ' : 'FALLA'} ${nombre}`)
  if (!cond) fallas++
}

const ms = buildIndex(pack)
const target = pack.piezas.find((p) => p.partNumber === '3115-2871-00')!

// Part number en dos formatos -> misma pieza, primera
for (const q of ['3115-2871-00', '3115287100']) {
  const res = searchPiezas(q, pack, ms)
  check(`"${q}" -> pieza correcta primera`, res.length > 0 && res[0].id === target.id)
}
// Texto -> la pieza aparece en resultados
check('"sello piston" -> pieza en resultados', searchPiezas('sello piston', pack, ms).some((p) => p.id === target.id))
// Basura no rompe y no inventa
check('"zapato xyz" -> sin resultados, sin crash', searchPiezas('zapato xyz', pack, ms).length === 0)
// Alias reemplazado_por -> pieza vigente
check(
  'alias 3115-4009-00 -> buje frontal vigente',
  searchPiezas('3115-4009-00', pack, ms).some((p) => p.id === 'p-buje-frontal'),
)

// Delta por hash: cambiar 1 asset -> 1 refetch, 0 remove
const mutados = pack.assets.map((a, i) => (i === 0 ? { ...a, hash: '0'.repeat(64) } : a))
const d1 = planAssetDelta(pack.assets, mutados)
check('delta detecta 1 cambio', d1.refetch.length === 1 && d1.remove.length === 0)
// Quitar 1 asset -> 0 refetch, 1 remove
const d2 = planAssetDelta(pack.assets, pack.assets.slice(1))
check('delta detecta 1 removido', d2.refetch.length === 0 && d2.remove.length === 1)
// Mismo pack -> sin cambios
const d3 = planAssetDelta(pack.assets, pack.assets)
check('delta sin cambios cuando es identico', d3.refetch.length === 0 && d3.remove.length === 0)

console.log(fallas ? `\n${fallas} FALLA(s)` : '\nTODO OK')
process.exit(fallas ? 1 : 0)
