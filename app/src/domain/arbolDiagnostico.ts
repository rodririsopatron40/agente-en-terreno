import type { NodoDiagnostico } from './types'

export const PROFUNDIDAD_MAX = 8

type Resultado = NonNullable<NodoDiagnostico['resultado']>

// Valida la ESTRUCTURA de un arbol de diagnostico (independiente de los ids que
// referencia): cada nodo es rama (pregunta + opciones) u hoja (resultado), nunca
// ambas ni ninguna; ninguna rama queda sin terminar en un resultado; sin ciclos;
// profundidad <= PROFUNDIDAD_MAX. Devuelve la lista de errores ('' = valido).
// Reutilizable por el validador de packs y por el wizard de diagnostico (Fase 4).
export function validarEstructuraArbol(
  raiz: NodoDiagnostico,
  maxProf: number = PROFUNDIDAD_MAX,
): string[] {
  const errores: string[] = []

  function walk(nodo: NodoDiagnostico, ruta: string, prof: number, enRama: Set<NodoDiagnostico>) {
    if (enRama.has(nodo)) {
      errores.push(`nodo ${ruta}: ciclo detectado (nodo repetido en la rama)`)
      return
    }
    if (prof > maxProf) {
      errores.push(`nodo ${ruta}: profundidad ${prof} supera el maximo (${maxProf})`)
      return
    }
    const esHoja = !!nodo.resultado
    const esRama = !!nodo.pregunta && Array.isArray(nodo.opciones) && nodo.opciones.length > 0
    if (esHoja === esRama) {
      errores.push(
        `nodo ${ruta}: debe ser rama (pregunta+opciones) u hoja (resultado), no ambas ni ninguna`,
      )
    }
    if (esRama) {
      const siguiente = new Set(enRama).add(nodo)
      nodo.opciones!.forEach((op, i) => walk(op.siguiente, `${ruta}/${i}`, prof + 1, siguiente))
    }
  }

  walk(raiz, 'raiz', 1, new Set())
  return errores
}

// Recolecta todos los resultados (hojas) de un arbol, para chequeos referenciales.
// Guarda contra ciclos: si el arbol no fue validado antes (validarEstructuraArbol),
// un ciclo colgaria la recursion. La guarda lo corta en vez de entrar en loop.
export function hojasDeArbol(raiz: NodoDiagnostico): Resultado[] {
  const hojas: Resultado[] = []
  const vistos = new Set<NodoDiagnostico>()
  function walk(nodo: NodoDiagnostico) {
    if (vistos.has(nodo)) return
    vistos.add(nodo)
    if (nodo.resultado) hojas.push(nodo.resultado)
    nodo.opciones?.forEach((op) => walk(op.siguiente))
  }
  walk(raiz)
  return hojas
}
