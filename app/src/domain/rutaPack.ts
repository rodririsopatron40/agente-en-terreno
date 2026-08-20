// Logica pura compartida por la funcion serverless (/api/packs) y sus tests.
// Traduce los segmentos de ruta pedidos a una ruta relativa SEGURA dentro del
// almacen de packs, o null si es hostil (traversal, separadores, byte nulo).

const NULO = String.fromCharCode(0) // byte nulo, sin literal de control en el fuente

export function rutaSegura(parts: unknown): string | null {
  if (!Array.isArray(parts) || parts.length === 0) return null
  for (const p of parts) {
    if (typeof p !== 'string' || p === '' || p === '.' || p === '..') return null
    // Un segmento nunca debe contener separadores ni un byte nulo: eso solo
    // aparece si alguien intenta escapar del directorio (ej. '..%2f').
    if (p.includes('/') || p.includes('\\') || p.includes(NULO)) return null
  }
  return parts.join('/')
}

export function contentTypePack(ruta: string): string {
  if (ruta.endsWith('.json')) return 'application/json; charset=utf-8'
  if (ruta.endsWith('.png')) return 'image/png'
  if (ruta.endsWith('.webp')) return 'image/webp'
  if (ruta.endsWith('.jpg') || ruta.endsWith('.jpeg')) return 'image/jpeg'
  if (ruta.endsWith('.svg')) return 'image/svg+xml'
  return 'application/octet-stream'
}
