# Asistente en Terreno

Asistente de reparaciones en terreno, multi-rubro, offline-first. Es una **plataforma de contenido**: la app no sabe de dominio. Todo el conocimiento del rubro vive en dos artefactos intercambiables, sin tocar codigo:

- `vertical.config.json` - terminologia, branding y contacto por rubro.
- **Content packs** - jerarquia activo -> sistema -> pieza -> falla -> procedimiento, versionada por activo.

Cambiar de rubro (mineria, automotriz, electrico, ...) = nuevo config + nuevos packs.

## Estructura

```
app/     PWA (Vite + React + TS + Tailwind v4 + vite-plugin-pwa)
  src/domain     contratos (tipos puros) y normalizacion de part numbers
  src/data       carga de config (Dexie e importador de packs llegan en Fase 1)
  src/features   catalogo, diagnostico, procedimientos, pedido, ia
  src/ui         componentes tontos
  public/config  vertical.config.json por rubro
  public/packs   packs de contenido (el mock se genera, no se versiona)
tools/   scripts de contenido (validadores y generador de pack mock)
```

## Puesta en marcha

Requiere Node 22+.

```bash
# 1. Dependencias (dos paquetes: raiz = tools, app = PWA)
npm install
cd app && npm install && cd ..

# 2. Generar el pack mock (no se versiona; es reproducible y deterministico)
npm run gen-mock

# 3. Validar contenido (schema + integridad referencial + hash + peso)
npm run validate

# 4. Desarrollo
cd app && npm run dev

# 5. Build de produccion
cd app && npm run build
```

## Estado

Fase 0 completa (contratos, scaffold, pack mock). Ver [PROGRESS.md](PROGRESS.md) para el detalle y la siguiente fase. El plan maestro por fases lo define un documento externo (Fable planifica, Opus ejecuta).

## Regla dura

Ningun string de dominio hardcodeado en componentes. Si un texto menciona un rubro concreto fuera de un pack o de un config, es un bug.
