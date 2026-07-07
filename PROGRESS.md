# PROGRESS

## Fase 0 — Contratos, scaffold, pack mock — HECHO (2026-07-04)
Scaffold Vite+React19+TS+Tailwind v4+PWA; contratos (`types.ts`, `partNumber.ts`); JSON Schema + validadores ajv2020 (pack/config); generador pack mock HidroMax BX-40 (20 piezas, 2 kits, 6 fallas, 4 procs, 29 fotos); 2 `vertical.config` + switch white-label. Commit baseline `2d548f8`. Verificado en navegador.

## Fase 1 — Shell PWA offline — HECHO (2026-07-05)
Dexie (packs+meta) + repositorio (import / update delta-por-hash / delete / activo); Cache Storage `pack-assets` con verificacion sha256 (el import descarga con `?dl=1` para saltar el SW y verificar bytes frescos antes de guardar); indice MiniSearch persistido (exacto por part number + alias con supersesion + fuzzy); SW Workbox: precache de app shell + config json (packs excluidos), runtime CacheFirst para imagenes de `/packs/`; indicador online/offline; UI minima funcional (gestor de packs con peso/progreso, catalogo por sistema, ficha con fotos/specs/aliases/kits). `index.json` de packs disponibles emitido por gen-mock.

**Verificado:** build limpio; `npm test` (busqueda + delta) verde; en preview de produccion el import real cachea 29 assets hash-verificados + deja el pack en Dexie, SW registrado, precache con shell+config. Pendiente (tuyo): click-through literal con DevTools en offline.

**Decisiones Fase 1:** el pack se guarda como 1 registro Dexie + browsing en memoria (sin normalizar tablas); la validacion de schema del pack es del pipeline (el cliente solo hace guarda liviana + hash de assets, que es la integridad que importa offline); UI deliberadamente minima -> Fase 2 la pule.

**Entorno:** el offline se prueba en el build de PREVIEW (tiene SW), no en dev. Doble clic en `C:\Users\ibook\terreno-preview.cmd` sirve el preview en :5180. El dev (`terreno-dev.cmd`, :5173) NO tiene SW.

**Nota para Fase 2:** hay dos piezas "sello de piston" (alta/baja); "sello piston" devuelve ambas (la 3115-2871-00 incluida). El DoD de Fase 2 pide que las tres busquedas den la MISMA pieza -> ajustar ranking o contenido.

## Fase 2 — Catalogo y busqueda — HECHO (2026-07-06)
Ranking de busqueda determinista + pulido de UI mobile.

**Decision del empate "sello piston" (ranking vs contenido): RANKING.** El contenido es correcto (ambas SON sellos de piston, alta/baja); renombrar seria mentir sobre el dominio. El orden es: score de MiniSearch desc -> criticidad desc -> partNumberNorm asc. Verificado empiricamente: para "sello piston" el score crudo ya separa las piezas (`3115-2871-00` alta = 17.2 vs `3115-2872-00` baja = 9.7), asi que la alta gana por score y queda primera. El desempate criticidad/partNumber NO decide este caso; es una garantia de determinismo por si dos piezas empatan el score exacto (scores iguales -> mismo orden siempre). Fix en `app/src/data/search.ts`.

**UI (mobile, una mano, 380px):**
- Fotos swipeables: carrusel `snap-x snap-mandatory`, items 82% ancho (la siguiente asoma), etiqueta por foto (Pieza/Instalada/Desgastada) + hint "Desliza". `PiezaDetail.tsx`.
- Supersesion visible en dos puntos: banner ambar en el catalogo al buscar un numero antiguo ("X es un numero antiguo. Reemplazado por Y"), y banner "Reemplaza a X. Usa este numero al pedir" en la ficha vigente. `Catalogo.tsx` / `PiezaDetail.tsx`.
- Targets >=48px: tabs 44->48, Volver 44->48 (input y lista ya cumplian: 48/62).
- Contraste subido a WCAG AA: textos secundarios neutral-500 -> neutral-400, nombres/valores a neutral-50/100, bordes neutral-800 -> neutral-700. Dark mode ya era default.

**Verificado:** `npm test` verde (las 3 consultas dan 3115-2871-00 primera + orden estable); build limpio; navegador headless a 380px: 3 busquedas OK en vivo, banner supersesion OK, carrusel 3 fotos con snap, targets medidos 48/48/62px, sin errores de consola. Screenshots en scratchpad.

## Pulido pre-Fase 3 — HECHO (2026-07-07)
Ticket corto antes de Procedimientos. Toca contrato -> schema -> validador -> mock -> UI encadenado.

1. **Ortografía:** tildes correctas en todos los strings de UI (Catálogo, En línea, número, pestaña, Vida útil, más, Otros números, Sin conexión) y del pack mock (Percusión, Hidráulico, Válvula, Pistón, presión, diámetro, etc.). Los strings de dominio viven en el pack/config; solo se corrigieron acentos.
2. **Specs:** contrato cambiado de `Record<string,string|number>` (llaves camelCase crudas) a `Spec[] = {etiqueta, valor, unidad?}`. El pack trae texto listo para mostrar; la app no mapea llaves a labels (respeta la regla dura). Actualizado: `types.ts`, `pack.schema.json`, mock (helpers `txt`/`num`), ficha. Guard `Array.isArray(specs)` para packs viejos cacheados.
3. **Criticidad white-label:** las 3 etiquetas se movieron a `terminologia.criticidad` del vertical.config (minería: "Detiene faena"; automotriz: "Inmoviliza el vehículo"). El color de severidad queda en `CriticidadBadge` (es visual, no dominio). Verificado en navegador: cambiar a Taller Automotriz Pro renombra los 3 niveles.
4. **Desktop:** columna centrada `max-w-2xl` (672px, medido) en app y ficha; carrusel con `.no-scrollbar` (scrollbar 0px, scroll-snap intacto).

Pack bumpeado a **v2** (el cambio de contrato invalida el pack v1 guardado; el usuario verá "Actualizar v2"; `updatePack` reconstruye el índice de búsqueda vía `buildIndex`).

**Verificado:** gen-mock + validate (pack v2 + 2 configs) OK; typecheck:tools OK; `npm test` verde; build limpio; navegador: specs con etiqueta+unidad, white-label de criticidad, tildes, desktop 672px centrado, carrusel sin scrollbar, sin errores de consola.

**Siguiente (Fase 3 — Procedimientos):** paso a paso con seguridad siempre visible, torques, herramientas, kit recomendado, fotos por paso. Datos ya en el pack (4 procedimientos).
