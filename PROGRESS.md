# PROGRESS

## Fase 0 — Contratos, scaffold, pack mock — HECHO (2026-07-04)
Scaffold Vite+React19+TS+Tailwind v4+PWA; contratos (`types.ts`, `partNumber.ts`); JSON Schema + validadores ajv2020 (pack/config); generador pack mock HidroMax BX-40 (20 piezas, 2 kits, 6 fallas, 4 procs, 29 fotos); 2 `vertical.config` + switch white-label. Commit baseline `2d548f8`. Verificado en navegador.

## Fase 1 — Shell PWA offline — HECHO (2026-07-05)
Dexie (packs+meta) + repositorio (import / update delta-por-hash / delete / activo); Cache Storage `pack-assets` con verificacion sha256 (el import descarga con `?dl=1` para saltar el SW y verificar bytes frescos antes de guardar); indice MiniSearch persistido (exacto por part number + alias con supersesion + fuzzy); SW Workbox: precache de app shell + config json (packs excluidos), runtime CacheFirst para imagenes de `/packs/`; indicador online/offline; UI minima funcional (gestor de packs con peso/progreso, catalogo por sistema, ficha con fotos/specs/aliases/kits). `index.json` de packs disponibles emitido por gen-mock.

**Verificado:** build limpio; `npm test` (busqueda + delta) verde; en preview de produccion el import real cachea 29 assets hash-verificados + deja el pack en Dexie, SW registrado, precache con shell+config. Pendiente (tuyo): click-through literal con DevTools en offline.

**Decisiones Fase 1:** el pack se guarda como 1 registro Dexie + browsing en memoria (sin normalizar tablas); la validacion de schema del pack es del pipeline (el cliente solo hace guarda liviana + hash de assets, que es la integridad que importa offline); UI deliberadamente minima -> Fase 2 la pule.

**Entorno:** el offline se prueba en el build de PREVIEW (tiene SW), no en dev. Doble clic en `C:\Users\ibook\terreno-preview.cmd` sirve el preview en :5180. El dev (`terreno-dev.cmd`, :5173) NO tiene SW.

**Nota para Fase 2:** hay dos piezas "sello de piston" (alta/baja); "sello piston" devuelve ambas (la 3115-2871-00 incluida). El DoD de Fase 2 pide que las tres busquedas den la MISMA pieza -> ajustar ranking o contenido.

**Siguiente (Fase 2 — Catalogo y busqueda):** navegacion jerarquica pulida, fotos swipeables, supersesion visible, targets >=48px a una mano, alto contraste. DoD: `3115-2871-00` / `3115287100` / `sello piston` -> misma pieza; flujo con una mano en viewport 380px.
