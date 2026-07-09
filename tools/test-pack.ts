// Test de logica pura (sin navegador): busqueda y delta de assets sobre el mock.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildIndex, searchPiezas } from '../app/src/data/search'
import { planAssetDelta } from '../app/src/domain/packDelta'
import { toggleMarcado, progresoResumen } from '../app/src/domain/checklist'
import { validarEstructuraArbol, hojasDeArbol } from '../app/src/domain/arbolDiagnostico'
import { nodoEnRuta, esHoja, esRama } from '../app/src/domain/diagnostico'
import type { NodoDiagnostico, Pack } from '../app/src/domain/types'

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

// DoD Fase 2: las tres consultas devuelven la MISMA pieza primera.
for (const q of ['3115-2871-00', '3115287100', 'sello piston']) {
  const res = searchPiezas(q, pack, ms)
  check(`"${q}" -> pieza correcta primera`, res.length > 0 && res[0].id === target.id)
}
// El desempate es estable: repetir la consulta no cambia el orden.
{
  const a = searchPiezas('sello piston', pack, ms).map((p) => p.id)
  const b = searchPiezas('sello piston', pack, ms).map((p) => p.id)
  check('"sello piston" -> orden estable entre llamadas', a.join(',') === b.join(','))
}
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

// --- Fase 3: checklist de procedimientos (logica pura persistible) ---
check('toggle marca un paso', toggleMarcado([], 2).join(',') === '2')
check('toggle desmarca si ya estaba', toggleMarcado([1, 2, 3], 2).join(',') === '1,3')
check('toggle mantiene orden ascendente', toggleMarcado([3, 1], 2).join(',') === '1,2,3')
{
  // Simula cerrar y reabrir: el estado marcado se preserva entre "sesiones".
  const sesion1 = toggleMarcado(toggleMarcado([], 1), 3) // marca pasos 1 y 3
  const alReabrir = [...sesion1] // lo que Dexie devolveria
  const r = progresoResumen(alReabrir, 5)
  check('progreso sobrevive reapertura', alReabrir.join(',') === '1,3' && r.hechos === 2 && !r.completo)
}
check('progreso completo cuando estan todos', progresoResumen([1, 2, 3], 3).completo === true)
check('progreso ignora ordenes fuera de rango', progresoResumen([1, 2, 9], 3).hechos === 2)

// --- Fase 3/4: validacion de arboles de diagnostico ---
// Los arboles reales del pack son estructuralmente validos.
check(
  'arboles del pack: estructura valida',
  pack.fallas.every((f) => validarEstructuraArbol(f.arbol).length === 0),
)
check('hojasDeArbol recolecta todos los resultados', hojasDeArbol(pack.fallas[0].arbol).length >= 1)
// Rama sin terminar en resultado -> error.
const ramaColgante: NodoDiagnostico = {
  pregunta: 'a?',
  opciones: [{ etiqueta: 'x', siguiente: {} as NodoDiagnostico }],
}
check('detecta rama que no termina en resultado', validarEstructuraArbol(ramaColgante).length > 0)
// Nodo que es rama y hoja a la vez -> error.
const ambiguo: NodoDiagnostico = {
  pregunta: 'a?',
  opciones: [{ etiqueta: 'x', siguiente: { resultado: { piezaIds: ['p'], procedimientoId: 'q' } } }],
  resultado: { piezaIds: ['p'], procedimientoId: 'q' },
}
check('detecta nodo ambiguo (rama y hoja)', validarEstructuraArbol(ambiguo).length > 0)
// Profundidad > 8 -> error.
let profundo: NodoDiagnostico = { resultado: { piezaIds: ['p'], procedimientoId: 'q' } }
for (let i = 0; i < 9; i++) profundo = { pregunta: 'a?', opciones: [{ etiqueta: 'x', siguiente: profundo }] }
check('detecta profundidad > 8', validarEstructuraArbol(profundo).some((e) => /profundidad/.test(e)))
// Ciclo -> error (arbol construido programaticamente, no desde JSON).
const ciclo: NodoDiagnostico = { pregunta: 'a?', opciones: [] }
ciclo.opciones!.push({ etiqueta: 'x', siguiente: ciclo })
check('detecta ciclo', validarEstructuraArbol(ciclo).some((e) => /ciclo/.test(e)))

// --- Fase 4: navegacion del wizard de diagnostico ---
// DoD: desde cualquier sintoma se llega SIEMPRE a un resultado valido (piezas y
// procedimiento existen en el pack).
{
  const piezaIds = new Set(pack.piezas.map((p) => p.id))
  const procIds = new Set(pack.procedimientos.map((p) => p.id))
  check(
    'todo resultado alcanzable referencia piezas y procedimiento validos',
    pack.fallas.every((f) =>
      hojasDeArbol(f.arbol).every(
        (r) =>
          r.piezaIds.length > 0 &&
          r.piezaIds.every((id) => piezaIds.has(id)) &&
          procIds.has(r.procedimientoId),
      ),
    ),
  )
}
const arbol0 = pack.fallas[0].arbol // f-perdida-presion (rama con 2 niveles)
check('camino vacio devuelve la raiz', nodoEnRuta(arbol0, []) === arbol0)
// Sintoma sin preguntas (raiz-hoja): resultado inmediato.
{
  const trabada = pack.fallas.find((f) => f.id === 'f-herramienta-trabada')!
  check('sintoma sin preguntas llega directo a resultado', esHoja(nodoEnRuta(trabada.arbol, [])))
}
// Elegir una opcion valida navega hacia una hoja.
check('opcion valida navega a una hoja', esHoja(nodoEnRuta(arbol0, [1])))
// Retroceder no corrompe: el prefijo del camino es el nodo padre (una rama), y
// re-caminar el mismo camino es determinista (misma referencia de nodo).
{
  const camino = [0, 0] // presion normal -> golpea debil -> hoja
  const hoja = nodoEnRuta(arbol0, camino)
  const padre = nodoEnRuta(arbol0, camino.slice(0, -1))
  check('camino completo llega a hoja', esHoja(hoja))
  check('retroceder un paso vuelve a una rama', esRama(padre))
  check('re-caminar el mismo camino es determinista', nodoEnRuta(arbol0, camino) === hoja)
}
// Indice fuera de rango: la navegacion es total, se detiene en un nodo valido.
check('indice invalido se detiene en la raiz (no lanza)', nodoEnRuta(arbol0, [99]) === arbol0)
check('basura tras una opcion valida se detiene en la rama', esRama(nodoEnRuta(arbol0, [0, 99])))
// Nodo "ni hoja ni rama" (pack malformado): el wizard no lo trata como pregunta
// (evita el crash de opciones! -> cae al fallback defensivo).
const nodoVacio = {} as NodoDiagnostico
check('nodo vacio no es ni hoja ni rama', !esHoja(nodoVacio) && !esRama(nodoVacio))

console.log(fallas ? `\n${fallas} FALLA(s)` : '\nTODO OK')
process.exit(fallas ? 1 : 0)
