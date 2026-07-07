import { useRef, useState } from 'react'

// Carrusel de fotos: swipe tactil (scroll-snap) + flechas en desktop + puntos
// indicadores. Las flechas se ocultan en movil (ahi manda el swipe). Los puntos
// son indicadores visuales, no targets; la navegacion con click es por flechas.
export function FotoCarrusel({ fotos }: { fotos: { src: string; alt: string; label: string }[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)
  const varias = fotos.length > 1

  function irA(i: number) {
    const cont = ref.current
    if (!cont) return
    const destino = Math.max(0, Math.min(fotos.length - 1, i))
    const hijo = cont.children[destino] as HTMLElement | undefined
    if (!hijo) return
    const delta = hijo.getBoundingClientRect().left - cont.getBoundingClientRect().left
    cont.scrollBy({ left: delta - (cont.clientWidth - hijo.clientWidth) / 2, behavior: 'smooth' })
  }

  function onScroll() {
    const cont = ref.current
    if (!cont) return
    const centro = cont.getBoundingClientRect().left + cont.clientWidth / 2
    let mejor = 0
    let mejorDist = Infinity
    Array.from(cont.children).forEach((ch, i) => {
      const r = (ch as HTMLElement).getBoundingClientRect()
      const dist = Math.abs(r.left + r.width / 2 - centro)
      if (dist < mejorDist) {
        mejorDist = dist
        mejor = i
      }
    })
    setIdx(mejor)
  }

  return (
    <div>
      <div className="relative">
        <div
          ref={ref}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-1 pb-1"
        >
          {fotos.map((f) => (
            <img
              key={f.src}
              src={f.src}
              alt={f.alt}
              className="h-52 w-[86%] flex-none snap-center rounded-lg border border-neutral-700 bg-neutral-900 object-contain"
            />
          ))}
        </div>

        {varias && (
          <>
            <Flecha lado="izq" disabled={idx === 0} onClick={() => irA(idx - 1)} />
            <Flecha lado="der" disabled={idx === fotos.length - 1} onClick={() => irA(idx + 1)} />
          </>
        )}
      </div>

      {varias && (
        <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden>
          {fotos.map((f, i) => (
            <span
              key={f.src}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? 'w-4 bg-neutral-200' : 'w-1.5 bg-neutral-600'
              }`}
            />
          ))}
        </div>
      )}

      <p className="mt-1 text-center text-xs text-neutral-400">{fotos[idx]?.label}</p>
    </div>
  )
}

function Flecha({
  lado,
  disabled,
  onClick,
}: {
  lado: 'izq' | 'der'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={lado === 'izq' ? 'Foto anterior' : 'Foto siguiente'}
      className={`absolute top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-700 bg-neutral-950/80 text-lg text-neutral-100 backdrop-blur disabled:opacity-30 md:flex ${
        lado === 'izq' ? 'left-1' : 'right-1'
      }`}
    >
      {lado === 'izq' ? '‹' : '›'}
    </button>
  )
}
