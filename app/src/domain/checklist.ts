// Logica pura del checklist de procedimientos (sin Dexie ni React), para poder
// testearla en node. La persistencia vive en data/procedimientoRepo.

// Marca/desmarca un paso por su 'orden'. Idempotente y con orden estable.
export function toggleMarcado(marcados: number[], orden: number): number[] {
  return marcados.includes(orden)
    ? marcados.filter((o) => o !== orden)
    : [...marcados, orden].sort((a, b) => a - b)
}

export function progresoResumen(
  marcados: number[],
  total: number,
): { hechos: number; total: number; completo: boolean } {
  const hechos = marcados.filter((o) => o >= 1 && o <= total).length
  return { hechos, total, completo: total > 0 && hechos === total }
}
