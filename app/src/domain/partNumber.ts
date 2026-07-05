// Regla de oro (plan 5.2): toda busqueda por numero pasa primero por esta
// normalizacion, tanto en partNumberNorm como en la tabla de aliases.
// Fuente unica de verdad, compartida entre la app y las herramientas de contenido.
export function normalizePartNumber(pn: string): string {
  return pn.toLowerCase().replace(/[^a-z0-9]/g, '');
}
