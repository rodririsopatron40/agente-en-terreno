// Clave de acceso de la demo (candado temporal del contenido). Se guarda local
// y se manda en cada descarga/actualizacion de packs protegidos. NO es el login
// definitivo (eso es FP1); solo protege la DESCARGA, no el uso offline local.
const KEY = 'demo-access-key'

export function getAccessKey(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function setAccessKey(v: string): void {
  localStorage.setItem(KEY, v.trim())
}

export function clearAccessKey(): void {
  localStorage.removeItem(KEY)
}

// El servidor respondio 401: la clave falta o es incorrecta. Tipo propio para
// que la UI la distinga de un error de red y pida la clave de nuevo.
export class ClaveInvalidaError extends Error {
  constructor() {
    super('Clave de acceso inválida')
    this.name = 'ClaveInvalidaError'
  }
}
