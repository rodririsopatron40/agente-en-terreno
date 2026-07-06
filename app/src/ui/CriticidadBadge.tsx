import type { Criticidad } from '../domain/types'

// La criticidad 3 usa el termino de sitio del rubro (Faena/Taller/Planta).
export function CriticidadBadge({ n, sitio }: { n: Criticidad; sitio: string }) {
  const map = {
    3: { txt: `Detiene ${sitio.toLowerCase()}`, cls: 'bg-red-500/15 text-red-300' },
    2: { txt: 'Importante', cls: 'bg-amber-500/15 text-amber-300' },
    1: { txt: 'Menor', cls: 'bg-neutral-700/50 text-neutral-300' },
  } as const
  const c = map[n]
  return <span className={`flex-none rounded px-1.5 py-0.5 text-xs ${c.cls}`}>{c.txt}</span>
}
