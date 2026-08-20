import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { timingSafeEqual } from 'node:crypto'
import { contentTypePack, rutaSegura } from '../../src/domain/rutaPack'

// Funcion serverless que sirve los packs PROTEGIDOS (fuera de /public). Exige la
// clave de acceso de la demo (env DEMO_KEY). Sin clave o clave incorrecta -> 401
// sin pistas. Fail closed: si DEMO_KEY no esta configurada, no sirve nada.
//
// La clave protege la DESCARGA. Una vez el pack esta en Cache Storage / Dexie del
// dispositivo, el uso offline no vuelve a pedirla (eso lo maneja la app).

const DATA_DIR = join(process.cwd(), 'api', '_data', 'packs')

function clavesIguales(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

// req/res son los del runtime Node de Vercel (@vercel/node): traen query, status
// y send/json. Se tipan laxo para no acoplar el archivo al paquete de tipos.
export default function handler(
  req: { headers: Record<string, string | string[] | undefined>; query: Record<string, string | string[] | undefined> },
  res: {
    status: (n: number) => typeof res
    json: (b: unknown) => void
    send: (b: unknown) => void
    setHeader: (k: string, v: string) => void
  },
): void {
  res.setHeader('Cache-Control', 'no-store')

  const esperado = process.env.DEMO_KEY ?? ''
  const cabecera = req.headers['x-demo-key']
  const provista = String(
    (Array.isArray(cabecera) ? cabecera[0] : cabecera) ?? req.query.key ?? '',
  )
  if (esperado === '' || !clavesIguales(provista, esperado)) {
    res.status(401).json({ error: 'Clave de acceso inválida' })
    return
  }

  const rel = rutaSegura(req.query.path)
  if (rel === null) {
    res.status(400).json({ error: 'Ruta inválida' })
    return
  }

  const file = join(DATA_DIR, rel)
  // Defensa en profundidad: aunque rutaSegura ya rechaza traversal, confirmamos
  // que el path resuelto no se escapo del almacen.
  if (!file.startsWith(DATA_DIR + '/') || !existsSync(file) || !statSync(file).isFile()) {
    res.status(404).json({ error: 'No encontrado' })
    return
  }

  const buf = readFileSync(file)
  res.setHeader('Content-Type', contentTypePack(rel))
  res.status(200).send(buf)
}
