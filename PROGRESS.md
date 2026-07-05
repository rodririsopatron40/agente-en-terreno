# PROGRESS

## Fase 0 — Contratos, scaffold y pack mock — HECHO (2026-07-04)

**Hecho:** scaffold Vite+React+TS+Tailwind v4+PWA; contratos en `app/src/domain/types.ts` + `partNumber.ts`; JSON Schema espejo (`tools/schema/`); validadores `validate-pack.ts` y `validate-config.ts` (ajv 2020); generador `gen-mock-pack.ts` (HidroMax BX-40: 20 piezas, 2 kits, 6 fallas, 4 procedimientos, 29 fotos PNG, 0.8 MB); 2 `vertical.config.json` (mineria/automotriz) + switch runtime en `App.tsx`.

**DoD verificado:** `npm run build` limpio; `npm run validate` verde; sin strings de dominio en `src/` (grep); dev server sirve config/pack/assets (200). Falta solo QA visual en navegador -> Fase 1.

**Decisiones:** monorepo simple (raiz=tools, `app/`=PWA, sin workspaces); versiones reales React 19.2 / Vite 8.1 / TS 6.0 / Tailwind 4.3 / vite-plugin-pwa 1.3 / Dexie 4.4 / MiniSearch 7.2; `pieza.kitIds` se DERIVA de la membresia de kits (no se duplica); fotos PNG via @napi-rs/canvas; icono PWA = favicon.svg placeholder (raster por vertical en Fase 7).

**Notas de entorno:** preview MCP rompe con espacios en la ruta -> correr dev con `npm run dev` dentro de `app/` (Bash). `launch.json` del preview vive en `claude 31may/.claude/`. No hay repo git aun (ofrecer `git init`).

**Siguiente (Fase 1 — Shell PWA offline):** importador de packs a Dexie con verificacion de hash; gestor de packs (listar/descargar/actualizar/eliminar, peso en MB); SW cache-first para assets de packs; indicador online/offline; indice MiniSearch al importar. DoD: navegar/buscar/abrir fichas offline sin requests fallidos.
