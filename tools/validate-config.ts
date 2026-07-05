// Valida los vertical.config.json de un directorio contra el schema y el registro.
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import type { VerticalConfig } from '../app/src/domain/types'

const here = dirname(fileURLToPath(import.meta.url))
const dirAbs = resolve(process.argv[2] ?? 'app/public/config')

const schema = JSON.parse(readFileSync(join(here, 'schema/config.schema.json'), 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
const validate = ajv.compile(schema)

const registroPath = join(dirAbs, 'verticales.json')
if (!existsSync(registroPath)) {
  console.error(`No existe el registro: ${registroPath}`)
  process.exit(2)
}
const registro = JSON.parse(readFileSync(registroPath, 'utf8')) as { id: string; nombre: string }[]

const errores: string[] = []
for (const item of registro) {
  const f = join(dirAbs, `${item.id}.json`)
  if (!existsSync(f)) {
    errores.push(`${item.id}: falta el archivo ${item.id}.json`)
    continue
  }
  const cfg = JSON.parse(readFileSync(f, 'utf8')) as VerticalConfig
  if (!validate(cfg)) {
    for (const e of validate.errors ?? []) {
      errores.push(`${item.id}: schema ${e.instancePath || '/'} ${e.message ?? ''}`)
    }
    continue
  }
  if (cfg.verticalId !== item.id) {
    errores.push(`${item.id}: verticalId '${cfg.verticalId}' no coincide con el id del registro`)
  }
}

if (errores.length) {
  console.error(`FAIL: ${errores.length} error(es) en configs`)
  for (const e of errores) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`OK: ${registro.length} vertical.config validos (${registro.map((r) => r.id).join(', ')})`)
