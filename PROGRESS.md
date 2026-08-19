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

## Fase 4 — Diagnóstico guiado — HECHO (2026-07-07)
Pestaña "Síntomas" (entre Catálogo y Packs, deshabilitada sin pack activo). Lista de síntomas agrupada por sistema (mismo orden que el catálogo) -> wizard de una pregunta por pantalla -> pantalla de resultado.

**Wizard:** una pregunta por pantalla; opciones como botones (56px, >=48 WCAG); "← Volver" retrocede un paso y en la primera pregunta vuelve a la lista. El resultado muestra: nota ("Posible causa"), piezas culpables (cada una linkea a su ficha reusando el overlay del catálogo vía `onSelectPieza`), "Ver procedimiento de reparación" (abre la vista REAL de Fase 3, que arranca en su gate de seguridad) y "Volver a empezar" (reset a la lista). Un síntoma con raíz-hoja (ej. "La herramienta se traba") muestra el resultado directo, sin preguntas.

**Estado en memoria (no persistido):** el wizard vive en `useState` de `Sintomas` (fallaId + camino de índices + procedimiento abierto). Reiniciar al cerrar/recargar es el comportamiento correcto (DoD); cambiar de pestaña también lo descarta.

**Navegación pura y total:** `domain/diagnostico.ts` (`nodoEnRuta`, `esHoja`, `esRama`). `nodoEnRuta` camina por índices y es TOTAL: un índice inválido detiene el paseo en el último nodo alcanzable en vez de lanzar. Eso blinda retroceder/reiniciar (el peor caso es quedar en un nodo válido, nunca corrupto). La estructura del árbol ya la garantiza `validarEstructuraArbol` (Fase 3), así que el wizard confía en la forma. El heading "Piezas a revisar" usa `t.pieza` (white-label).

**Deuda del inquisidor (misma sesión):** (1) keys de listas en `ProcedimientoView` (herramientas/seguridad) por índice compuesto `${i}-${valor}`, no por contenido (dos strings iguales colisionaban). (2) Comentario junto al gate de seguridad: documenta que el gate blinda la carrera carga-vs-toggle (la carga async de Dexie resuelve mientras el usuario lee seguridad; el toggle solo existe en fase 'pasos'); si el gate se vuelve condicional, agregar flag `cargado`. (3) Nota corregida del fire-and-forget en `toggle`: el fix futuro NO es revertir a `prev` del closure (pisaría toggles posteriores), sino revertir solo el paso fallido (re-togglear ese `orden`) o releer de Dexie.

**Inquisidor (auto-revisión del diff, misma sesión):** dos hallazgos en el propio código de Fase 4, corregidos. (a) `reiniciar`/`retroceder`-a-lista no limpiaban `verProc` (reset incompleto; hoy inalcanzable porque el overlay z-20 tapa los botones, pero contradice el "reset total" del DoD) -> `reiniciar` ahora hace `setVerProc(null)`. (b) `nodo.opciones!` solo estaba protegido por `!esHoja`: un nodo "ni hoja ni rama" (pack malformado, no re-validado en runtime) crasheaba, y el comentario prometía un "fin defensivo" que el código no tenía -> se gatea `Pregunta` tras `esRama` y se agrega fallback. Test nuevo que fija el contrato (nodo vacío no es hoja ni rama).

**Verificado:** typecheck:tools OK; `npm test` 31 verdes (10 nuevos: todo resultado alcanzable resuelve piezas+procedimiento; camino vacío = raíz; síntoma sin preguntas = resultado directo; navegar a hoja; retroceder vuelve a la rama padre; re-caminar determinista; índice fuera de rango no lanza; nodo vacío ni hoja ni rama); build limpio; oxlint sin warnings nuevos. Headless 380px: lista agrupada (3 sistemas, 6 síntomas), wizard de 2 niveles, botones medidos 56px, resultado con nota + 2 culpables que linkean a la ficha correcta, "Ver procedimiento" abre la vista real con su gate de seguridad, retroceder RESULT->Q2->Q1 y re-responder la otra rama da el resultado distinto correcto (sin corrupción), "Volver a empezar" resetea a la lista (sin overlay colgando), síntoma raíz-hoja directo. Sin errores de consola.

## Fase 4 Deployment — HECHO (2026-07-10)
**RESOLUCIÓN:** Repo hecho público en GitHub → deploy recién empujado (commit `3d1c10b`) pasó sin bloqueos → Vercel Ready (green) → todos los packs (969K, 31 archivos) ya en `dist/packs/` → `/packs/index.json` respondiendo correctamente → app completamente funcional en producción.

**URL pública (Vercel):** https://agente-en-terreno.vercel.app/

**Verificado end-to-end en navegador (2026-07-10):**
- **Catálogo:** búsqueda + listado de piezas por sistema (PERCUSIÓN, HIDRÁULICO, etc.) funcional, fichas con fotos/specs/procedimientos
- **Síntomas:** lista de 6 síntomas agrupada en 3 sistemas, wizard de preguntas respondiendo correctamente ("Ruido metálico anormal" → "¿El ruido aparece solo al golpear?" con 2 opciones botón)
- **Packs:** HidroMax BX-40 listado en DISPONIBLES (0.87 MB, 20 piezas) sin "Cargando..." eterno; también en INSTALADOS con versión (v2); índice JSON servido correctamente
- **Indicador online:** verde ("En línea")
- **White-label minería:** activo ("Soporte Terreno Minero", "Distribuidor de Maquinaria")

**Root cause del "Cargando..." eterno (diagrama final):**
1. Vercel Hobby plan **bloquea deploys** de repos privados si el commit author no tiene "contributing access"
2. Commit `e1e3609` ("Commit del pack mock para el deploy en Vercel") empujó 31 archivos (pack + 29 PNGs) pero quedó marcado como "Blocked" porque era de un autor que Vercel no reconocía
3. Hacer repo público en GitHub Settings no **retroactivamente** desbloquea ese deploy viejo; quedó marcado "Blocked Stale"
4. Solución: nuevo commit (`3d1c10b`, trivial/empty, solo para trigger) → Vercel crea deploy nuevo → sin bloqueo porque ahora el repo es público
5. Deploy nuevo pasa (Ready, green) → packs disponibles → app funciona

**Deployment timeline:**
- `e1e3609` (Blocked, 2d ago): packs commiteados pero Vercel rechaza deploy por plan Hobby + repo privado
- Cambio a público (Settings > Danger Zone > Change visibility > public)
- `3d1c10b` (Ready, 3m ago): commit vacío "chore: trigger Vercel redeploy (repo now public)" → nueva tentativa
- Vercel ahora acepta → build OK → packs en dist → app live

## Fase Pedidos — HECHO (2026-07-10)
Pestaña "Pedido" (entre Síntomas y Packs, deshabilitada sin pack activo, con badge de cantidad del carrito). Carrito editable -> datos de contacto persistidos -> generar orden -> cola de envío (WhatsApp/email) -> historial. Sin backend.

**Carrito:** reutiliza la tabla `pedido` (intenciones de los stubs de Fase 3). Cantidades editables con steppers (− n +), quitar ítem (×). `agregarAPedido` ahora es idempotente SIN resetear: re-agregar preserva la cantidad y la antigüedad que el usuario ya ajustó (antes hacía `put` que reiniciaba). Vaciar automático al generar la orden.

**Solicitante:** nombre + empresa/faena + teléfono, persistidos en `meta` KV (`solicitante`, JSON). Se piden la primera vez (form abierto), luego colapsan a resumen con "Editar". Generar requiere nombre y teléfono no vacíos.

**Órdenes (cola + historial):** tabla nueva `ordenes` (Dexie **v3**). `crearOrden` congela un SNAPSHOT del carrito (nombre + part number + cantidad por línea, + equipo, + solicitante) -> el texto del pedido queda correcto aunque el pack se actualice o borre. Estado `pendiente` -> `enviado`. "Reenviar" reabre a pendiente.

**Envío:** `domain/pedido.ts` (puro, testeable): `construirMensaje` (texto estructurado con todos los part numbers y cantidades), `waLink` (limpia el número a solo dígitos para wa.me + encode), `mailtoLink` (subject+body encoded), `clampCantidad` (entero >=1). WhatsApp abre `wa.me` en pestaña nueva; email va por `location.href` (evita pestaña en blanco). El número/email salen del `vertical.config.pedidos` (minería tiene ambos; automotriz solo email -> el botón WhatsApp se oculta solo).

**Cola offline (DoD central):** el envío se gatea con `navigator.onLine`. Sin señal, la orden pendiente muestra nota ámbar "Sin conexión, se enviará al reconectar" y oculta los botones de envío; al volver la conexión reaparecen (los listeners online/offline de App re-renderizan). La orden persiste en Dexie -> crear en modo avión, reconectar y enviar con un tap.

**Dexie v3:** `cantidad` se agrega a `pedido` sin cambiar índice (filas v2 se leen con default 1, sin migración); la tabla `ordenes` (índices `id, estado, createdAt`) justifica el bump. Lógica pura en `domain/pedido.ts`; repo en `data/pedidoRepo.ts` (carrito CRUD, solicitante, órdenes). Tipos `Solicitante`/`OrdenLinea`/`Orden` en `domain/types.ts`.

**Inquisidor (auto-revisión del diff, misma sesión):** un papercut corregido — `window.open('mailto:')` dejaba pestaña en blanco -> email ahora por `location.href`. Observación documentada (no bug): la lista de órdenes es global entre packs; una orden pendiente vista bajo otro vertical ofrece los canales de ESE vertical (el snapshot de part numbers queda intacto).

**Verificado:** `npm test` verde (13 tests nuevos: mensaje incluye TODOS los part numbers + cantidades + solicitante + equipo; determinismo; `clampCantidad` 0/-5/2.9/NaN/3; `waLink` limpia número y encodea; `mailtoLink` subject/body/saltos de línea); typecheck:tools OK; build limpio; oxlint sin warnings nuevos (queda 1 preexistente en App.tsx:52). Navegador (preview :5180, 375px): descargar pack -> agregar 2 piezas desde fichas -> badge "2" -> carrito con ambas + steppers -> subir Pistón a 3 -> llenar contacto (colapsa a resumen) -> generar (carrito se vacía, badge a 0) -> PENDIENTES muestra "4 unidades · 2 ítems" con detalle -> interceptar `window.open`: link `https://wa.me/56990000000?text=...` con mensaje decodificado correcto (3x Pistón 3115-2010-00, 1x Sello 3115-2871-00, datos de Juan Pérez) -> orden pasa a ENVIADOS con "Reenviar" -> nueva orden + simular offline: nota ámbar + botones ocultos; online: botones reaparecen -> reload: pendiente + historial + solicitante PERSISTEN. Sin errores de consola.

**Pendiente (tuyo):** deep-link real de WhatsApp/email en teléfono físico (parte de la prueba Android/iPhone). Deploy: el diff está en local, falta `git push` para que Vercel lo publique.

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

**Siguiente (Fase 5 — IA/RAG):** el insumo del RAG ya está en el pack (`descripcionVisual` por pieza). Pendiente además el envío real del pedido (hoy stub idempotente en Dexie, tabla `pedido`).
