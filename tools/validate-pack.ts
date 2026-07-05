// Valida un pack.json: (1) schema JSON, (2) integridad referencial,
// (3) regla de oro de part numbers, (4) existencia y hash de assets, (5) peso.
// Sale con codigo !=0 si hay errores. Los avisos no bloquean.
import { readFileSync, existsSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import type { Pack, NodoDiagnostico } from '../app/src/domain/types'
import { normalizePartNumber } from '../app/src/domain/partNumber'

const here = dirname(fileURLToPath(import.meta.url))

const packArg = process.argv[2]
if (!packArg) {
  console.error('Uso: tsx tools/validate-pack.ts <ruta/pack.json>')
  process.exit(2)
}
const packAbs = resolve(packArg)
if (!existsSync(packAbs)) {
  console.error(`No existe el pack: ${packAbs}`)
  process.exit(2)
}
const packDir = dirname(packAbs)

const errores: string[] = []
const avisos: string[] = []

// --- 1. Schema ---
const schema = JSON.parse(readFileSync(join(here, 'schema/pack.schema.json'), 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
const validate = ajv.compile(schema)

const pack = JSON.parse(readFileSync(packAbs, 'utf8')) as Pack
if (!validate(pack)) {
  for (const e of validate.errors ?? []) {
    errores.push(`schema ${e.instancePath || '/'} ${e.message ?? ''}`)
  }
  // Sin schema valido no tiene sentido seguir con chequeos semanticos.
  reportar()
}

// --- 2. Integridad referencial ---
const sistemaIds = new Set(pack.sistemas.map((s) => s.id))
const piezaIds = new Set(pack.piezas.map((p) => p.id))
const kitIds = new Set(pack.kits.map((k) => k.id))
const procIds = new Set(pack.procedimientos.map((p) => p.id))
const assetRutas = new Set(pack.assets.map((a) => a.ruta))
const fotosReferenciadas = new Set<string>()

for (const s of pack.sistemas) {
  if (s.activoId !== pack.activo.id) {
    errores.push(`sistema '${s.id}': activoId '${s.activoId}' != activo '${pack.activo.id}'`)
  }
}

for (const p of pack.piezas) {
  if (!sistemaIds.has(p.sistemaId)) {
    errores.push(`pieza '${p.id}': sistemaId '${p.sistemaId}' inexistente`)
  }
  if (p.partNumberNorm !== normalizePartNumber(p.partNumber)) {
    errores.push(`pieza '${p.id}': partNumberNorm no coincide con normalize('${p.partNumber}')`)
  }
  if (p.procedimientoId && !procIds.has(p.procedimientoId)) {
    errores.push(`pieza '${p.id}': procedimientoId '${p.procedimientoId}' inexistente`)
  }
  for (const kid of p.kitIds) {
    if (!kitIds.has(kid)) errores.push(`pieza '${p.id}': kitId '${kid}' inexistente`)
  }
  for (const f of p.fotos.aislada) fotosReferenciadas.add(f)
  if (p.fotos.instalada) fotosReferenciadas.add(p.fotos.instalada)
  if (p.fotos.desgastada) fotosReferenciadas.add(p.fotos.desgastada)
}
if (pack.activo.foto) fotosReferenciadas.add(pack.activo.foto)

for (const a of pack.aliases) {
  if (!piezaIds.has(a.piezaId)) errores.push(`alias '${a.partNumber}': piezaId '${a.piezaId}' inexistente`)
  if (a.partNumberNorm !== normalizePartNumber(a.partNumber)) {
    errores.push(`alias '${a.partNumber}': partNumberNorm no coincide con normalize()`)
  }
}

for (const k of pack.kits) {
  for (const pid of k.piezaIds) {
    if (!piezaIds.has(pid)) errores.push(`kit '${k.id}': piezaId '${pid}' inexistente`)
  }
  // consistencia bidireccional kit <-> pieza
  for (const pid of k.piezaIds) {
    const pieza = pack.piezas.find((p) => p.id === pid)
    if (pieza && !pieza.kitIds.includes(k.id)) {
      avisos.push(`kit '${k.id}' incluye '${pid}' pero la pieza no lo lista en kitIds`)
    }
  }
}

function walkNodo(nodo: NodoDiagnostico, ruta: string, fallaId: string) {
  const esHoja = !!nodo.resultado
  const esRama = !!nodo.pregunta && !!nodo.opciones && nodo.opciones.length > 0
  if (esHoja === esRama) {
    errores.push(`falla '${fallaId}' nodo ${ruta}: debe ser rama (pregunta+opciones) u hoja (resultado), no ambas ni ninguna`)
  }
  if (nodo.resultado) {
    if (!procIds.has(nodo.resultado.procedimientoId)) {
      errores.push(`falla '${fallaId}' nodo ${ruta}: procedimientoId '${nodo.resultado.procedimientoId}' inexistente`)
    }
    for (const pid of nodo.resultado.piezaIds) {
      if (!piezaIds.has(pid)) errores.push(`falla '${fallaId}' nodo ${ruta}: piezaId '${pid}' inexistente`)
    }
  }
  nodo.opciones?.forEach((op, i) => walkNodo(op.siguiente, `${ruta}/${i}`, fallaId))
}

for (const f of pack.fallas) {
  if (!sistemaIds.has(f.sistemaId)) errores.push(`falla '${f.id}': sistemaId '${f.sistemaId}' inexistente`)
  walkNodo(f.arbol, 'raiz', f.id)
}

for (const proc of pack.procedimientos) {
  if (proc.kitRecomendadoId && !kitIds.has(proc.kitRecomendadoId)) {
    errores.push(`procedimiento '${proc.id}': kitRecomendadoId '${proc.kitRecomendadoId}' inexistente`)
  }
  for (const paso of proc.pasos) {
    if (paso.foto) fotosReferenciadas.add(paso.foto)
  }
}

// --- 3. Assets: fotos referenciadas presentes en manifest y en disco, hash correcto ---
for (const ruta of fotosReferenciadas) {
  if (!assetRutas.has(ruta)) errores.push(`foto referenciada '${ruta}' no esta en el manifest de assets`)
}
for (const a of pack.assets) {
  if (!fotosReferenciadas.has(a.ruta)) avisos.push(`asset '${a.ruta}' en manifest pero no referenciado (huerfano)`)
  const fileAbs = join(packDir, a.ruta)
  if (!existsSync(fileAbs)) {
    errores.push(`asset '${a.ruta}': archivo no existe en disco`)
    continue
  }
  const buf = readFileSync(fileAbs)
  const hash = createHash('sha256').update(buf).digest('hex')
  if (hash !== a.hash) errores.push(`asset '${a.ruta}': hash no coincide (manifest ${a.hash.slice(0, 8)}.. vs disco ${hash.slice(0, 8)}..)`)
  const kbReal = Math.round((statSync(fileAbs).size / 1024) * 10) / 10
  if (Math.abs(kbReal - a.kb) > 1) avisos.push(`asset '${a.ruta}': kb manifest ${a.kb} vs disco ${kbReal}`)
}

// --- 4. Peso del pack (riesgo #3: advertir sobre 200 MB) ---
const totalKb = pack.assets.reduce((acc, a) => acc + a.kb, 0)
const totalMb = Math.round((totalKb / 1024) * 10) / 10
if (totalMb > 200) errores.push(`pack pesa ${totalMb} MB (> 200 MB, tope duro del validador)`)
else if (totalMb > 150) avisos.push(`pack pesa ${totalMb} MB (> 150 MB, presupuesto recomendado por familia)`)

reportar()

function reportar(): never {
  if (avisos.length) {
    console.warn(`AVISOS (${avisos.length}):`)
    for (const a of avisos) console.warn(`  - ${a}`)
  }
  if (errores.length) {
    console.error(`\nFAIL: ${errores.length} error(es) en ${packArg}`)
    for (const e of errores) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log(
    `OK: pack '${pack.packId}' v${pack.version} valido - ` +
      `${pack.piezas.length} piezas, ${pack.kits.length} kits, ${pack.fallas.length} fallas, ` +
      `${pack.procedimientos.length} procedimientos, ${pack.assets.length} assets, ${totalMb} MB`,
  )
  process.exit(0)
}
