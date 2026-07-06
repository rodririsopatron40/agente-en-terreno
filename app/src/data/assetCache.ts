// Cache Storage de assets de packs, con verificacion de integridad sha256.
// El service worker (Fase 1, vite.config) sirve /packs/** cache-first desde
// esta misma cache, por lo que las <img> funcionan offline una vez importadas.
const CACHE = 'pack-assets'

export async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Descarga, verifica hash y guarda. Devuelve bytes. Si el hash no calza, no cachea.
export async function cacheAssetVerified(url: string, expectedHash: string): Promise<number> {
  // ?dl=1 evita el cache-first del service worker: verificamos el hash sobre
  // bytes frescos de red y recien entonces guardamos en la cache (url limpia).
  const res = await fetch(`${url}?dl=1`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`No se pudo descargar ${url} (HTTP ${res.status})`)
  const buf = await res.arrayBuffer()
  const hash = await sha256Hex(buf)
  if (hash !== expectedHash) {
    throw new Error(
      `Hash no coincide para ${url} (esperado ${expectedHash.slice(0, 8)}.., obtenido ${hash.slice(0, 8)}..)`,
    )
  }
  const cache = await caches.open(CACHE)
  await cache.put(url, new Response(buf, { headers: { 'Content-Type': contentTypeFor(url) } }))
  return buf.byteLength
}

export async function deleteCached(urls: string[]): Promise<void> {
  const cache = await caches.open(CACHE)
  await Promise.all(urls.map((u) => cache.delete(u)))
}

function contentTypeFor(url: string): string {
  if (url.endsWith('.png')) return 'image/png'
  if (url.endsWith('.webp')) return 'image/webp'
  if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg'
  if (url.endsWith('.svg')) return 'image/svg+xml'
  return 'application/octet-stream'
}
