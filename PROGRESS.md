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

## Ticket carrusel — HECHO (2026-07-07)
Al ocultar la scrollbar nativa (pulido previo) el carrusel quedó sin navegación en desktop. Nuevo componente `FotoCarrusel` (`app/src/features/catalogo/FotoCarrusel.tsx`): flechas ‹ › (size-12, `hidden md:flex` -> visibles en desktop, ocultas en móvil), puntos indicadores debajo (el actual resaltado), swipe táctil intacto (scroll-snap). Solo si hay >1 foto. Verificado: desktop 2 flechas funcionales (avanzan foto), móvil 0 visibles.

## Fase 3 — Procedimientos — HECHO (2026-07-07)
Nota del planificador: orden de fases invertido. Fase 3 = Procedimientos (esta), Fase 4 = Diagnóstico guiado (después).

**Flujo:** la ficha de pieza dejó de ser hoja muerta: si la pieza tiene `procedimientoId`, botón "Ver procedimiento de reparación" abre `ProcedimientoView` (overlay z-20 sobre la ficha z-10). Fase `seguridad` (siempre primero, no saltable): duración estimada + herramientas + kit recomendado + bloque rojo de seguridad + gate "He leído la seguridad, comenzar". Fase `pasos`: checklist. La seguridad reaparece en cada apertura, aun al retomar (DoD).

**Checklist persistente:** cada check se guarda en Dexie (tabla `progreso`, id `packId:procId`, `marcados: number[]`). Al cerrar y reabrir la app, los pasos marcados se retoman. Por paso: texto, foto opcional, torque destacado (badge sky), advertencia opcional (badge ámbar). Progreso "Paso X de N".

**Pedido stub:** botón contextual "Agregar al pedido" (pieza, en la ficha) y "Agregar kit al pedido" (en el procedimiento) escriben la intención en Dexie (tabla `pedido`, clave `packId:tipo:refId`, idempotente). El flujo de envío real es fase posterior.

**Datos:** Dexie a **v2** (tablas `progreso` + `pedido`; `packs`/`meta` intactas). Lógica pura del checklist en `domain/checklist.ts` (testeable sin Dexie), reexportada por `data/procedimientoRepo.ts`.

**Validación de árboles (prep Fase 4):** `domain/arbolDiagnostico.ts` con `validarEstructuraArbol` (rama-u-hoja, toda rama termina en resultado, sin ciclos, profundidad <=8) y `hojasDeArbol`. `validate-pack` lo usa; los chequeos referenciales corren solo si la estructura es válida.

**Verificado:** typecheck:tools OK; `npm test` 21 verdes (incluye toggle/persistencia de checklist y los 4 casos de árbol inválido: rama colgante, nodo ambiguo, profundidad>8, ciclo); validate OK; build limpio; headless 380px: ficha->procedimiento->seguridad-primero->checklist; marcar pasos 2 y 4, recargar (cerrar/reabrir), reabrir -> seguridad reaparece y checks persisten ("Paso 2 de 5", marcados [2,4]); stub de pedido escribe en Dexie; flechas de carrusel visibles/funcionales en desktop, ocultas en móvil. Sin errores de consola.

## Plan de verificación Safari/iOS (ejecución manual del usuario)
Objetivo: confirmar PWA instalable + offline real en iPhone. Requiere que el sitio esté servido por HTTPS (o el preview en la LAN); `localhost` no instala PWA en iOS.

1. **Servir accesible al iPhone.** El SW solo existe en el build de producción. En el PC: `cd app && npm run build && npm run preview -- --host` y anotar la URL de red (ej. `http://192.168.x.x:5180`). El iPhone debe estar en la misma WiFi. (iOS pide HTTPS para SW salvo en algunos contextos LAN; si Safari no registra el SW por http, usar un túnel HTTPS tipo `cloudflared`/`ngrok` apuntando a :5180.)
2. **Abrir en Safari iOS** (no Chrome iOS: usa el mismo WebKit pero el flujo de instalación es el de Safari). Cargar la URL, esperar a que liste el pack disponible.
3. **Instalar la PWA:** botón Compartir -> "Agregar a inicio". Abrir la app desde el ícono (modo standalone, sin barra de Safari).
4. **Descargar el pack** dentro de la PWA (pestaña Packs -> Descargar). Confirmar barra de progreso y que quede "Instalado".
5. **Modo avión ON** (corta WiFi y datos). El badge debe pasar a "Offline".
6. **Navegación offline a probar:**
   - Catálogo: buscar "3115-2871-00" y "sello piston" -> abre ficha con foto (desde Cache Storage).
   - Ficha -> "Ver procedimiento" -> pantalla de seguridad -> pasos.
   - Marcar 2-3 pasos. **Cerrar la app por completo** (swipe up en el multitarea) y reabrir -> el procedimiento retoma los pasos marcados.
   - Agregar una pieza y un kit al pedido (stub) -> sin errores.
7. **Reportar:** si algún asset no carga offline (placeholder roto), si el SW no quedó registrado (todo falla sin red), o si el checklist no persiste tras cerrar. Datos útiles: versión de iOS, si se usó túnel HTTPS o LAN directa.

Puntos de riesgo conocidos en iOS: (a) cuota de almacenamiento de Safari puede evictar IndexedDB/Cache si el equipo está bajo presión de espacio; (b) el SW requiere HTTPS; (c) `navigator.onLine` en iOS a veces tarda en reflejar el modo avión.

**Siguiente (Fase 4 — Diagnóstico guiado):** alcance aprobado con dos cambios: el resultado linkea al procedimiento (ya funcional), y el estado del wizard NO se persiste (memoria; reiniciar al cerrar es correcto). La validación de árboles ya está lista.
