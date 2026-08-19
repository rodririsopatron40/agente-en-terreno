import type { Orden } from './types'

// Logica pura del pedido (testeable sin Dexie ni navegador): construccion del
// texto del mensaje y de los links de envio. Determinista: mismos datos ->
// mismo texto y mismo link.

// Cantidad valida: entero >= 1. Blinda inputs raros (vacio, decimal, negativo).
export function clampCantidad(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.max(1, Math.floor(n))
}

// Texto estructurado del pedido. Cada linea lleva su part number (lo que el
// distribuidor necesita para despachar). Con tildes: es texto visible.
export function construirMensaje(orden: Orden): string {
  const items = orden.lineas
    .map((l) => `- ${l.cantidad}x ${l.nombre} (${l.partNumber})`)
    .join('\n')
  return [
    `Pedido de repuestos - ${orden.equipoNombre}`,
    '',
    items,
    '',
    `Solicita: ${orden.solicitante.nombre}`,
    `Empresa/Faena: ${orden.solicitante.empresa}`,
    `Teléfono: ${orden.solicitante.telefono}`,
  ].join('\n')
}

// Asunto para el correo (mailto). Corto, identifica el equipo.
export function asuntoPedido(orden: Orden): string {
  return `Pedido de repuestos - ${orden.equipoNombre}`
}

// Link de WhatsApp (wa.me). El numero va SOLO con digitos (wa.me rechaza '+',
// espacios y guiones); el mensaje va URL-encoded.
export function waLink(whatsapp: string, mensaje: string): string {
  const num = whatsapp.replace(/\D/g, '')
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`
}

// Link mailto con asunto y cuerpo URL-encoded.
export function mailtoLink(email: string, asunto: string, mensaje: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`
}
