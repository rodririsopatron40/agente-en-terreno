import type { NodoDiagnostico } from './types'

// Navegacion del wizard de diagnostico (Fase 4). Logica pura, sin React ni Dexie,
// para poder testearla en node. El estado del wizard vive EN MEMORIA: el "camino"
// es la lista de indices de opcion elegidos desde la raiz del arbol. No se persiste
// a proposito -> reiniciar al cerrar la app es el comportamiento correcto.
//
// La ESTRUCTURA del arbol ya la garantiza validarEstructuraArbol (validate-pack):
// cada nodo es exactamente rama u hoja, sin ciclos, profundidad acotada. Por eso
// aca confiamos en esa forma y solo decidimos que renderizar.

// Camina el arbol siguiendo `camino`. TOTAL por diseno: si un indice no apunta a
// una opcion existente, se detiene en el ultimo nodo alcanzable en vez de lanzar.
// Esto blinda "retroceder" y "volver a empezar": el peor caso es quedar parado en
// un nodo valido del arbol, nunca en un estado corrupto.
export function nodoEnRuta(raiz: NodoDiagnostico, camino: number[]): NodoDiagnostico {
  let nodo = raiz
  for (const i of camino) {
    const op = nodo.opciones?.[i]
    if (!op) break
    nodo = op.siguiente
  }
  return nodo
}

// Hoja = tiene resultado (piezas culpables + procedimiento + nota). Es el final del
// wizard: un arbol validado termina toda rama en una hoja, asi que desde cualquier
// sintoma siempre se llega a un resultado valido.
export function esHoja(n: NodoDiagnostico): boolean {
  return !!n.resultado
}

// Rama = pregunta con al menos una opcion. En un arbol valido un nodo es hoja XOR
// rama; el wizard trata "ni una ni otra" como fin defensivo (no ocurre con packs
// validados, pero mantiene la navegacion total).
export function esRama(n: NodoDiagnostico): boolean {
  return !!n.pregunta && Array.isArray(n.opciones) && n.opciones.length > 0
}
