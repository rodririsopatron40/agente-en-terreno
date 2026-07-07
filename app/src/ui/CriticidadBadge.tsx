import type { Criticidad } from '../domain/types'

// El texto por nivel viene del vertical.config (dominio). El color es severidad
// visual y por eso vive aca, no en el pack ni en el config.
const CLS: Record<Criticidad, string> = {
  3: 'bg-red-500/15 text-red-300',
  2: 'bg-amber-500/15 text-amber-300',
  1: 'bg-neutral-700/50 text-neutral-300',
}

export function CriticidadBadge({ n, label }: { n: Criticidad; label: string }) {
  return <span className={`flex-none rounded px-1.5 py-0.5 text-xs ${CLS[n]}`}>{label}</span>
}
