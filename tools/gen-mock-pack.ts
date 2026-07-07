// Genera el pack mock "HidroMax BX-40" (martillo hidraulico FICTICIO) para
// construir toda la app sin backend ni contenido real. Produce pack.json +
// fotos PNG placeholder (texto legible con nombre y part number) y el manifest
// de assets con hash sha256. Idempotente: borra y regenera el directorio.
//
// El contenido es inventado a proposito (ver plan, punto 7): los datos reales
// del distribuidor llegan por el importador de la Fase 6.
import { mkdirSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas } from '@napi-rs/canvas'
import type {
  Pack,
  Pieza,
  Sistema,
  Falla,
  Procedimiento,
  Kit,
  PartNumberAlias,
  AssetManifest,
  Activo,
  Criticidad,
  Spec,
} from '../app/src/domain/types'
import { normalizePartNumber } from '../app/src/domain/partNumber'

// Helpers para specs legibles: texto (sin unidad) y numero (con unidad opcional).
const txt = (etiqueta: string, valor: string): Spec => ({ etiqueta, valor })
const num = (etiqueta: string, valor: number, unidad?: string): Spec => ({ etiqueta, valor, unidad })

const here = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(here, '../app/public/packs/hidromax-bx40')
const ASSETS_SUBDIR = 'assets'

// ---------- Activo y sistemas ----------
const activo: Activo = {
  id: 'act-bx40',
  nombre: 'HidroMax BX-40',
  modelo: 'BX-40',
  categoria: 'Martillo hidráulico',
  descripcion:
    'Martillo hidráulico de rango medio para excavadora 18-26 t. Energía de impacto 4000 J, ' +
    'frecuencia 400-900 golpes/min. Modelo ficticio de demostración.',
  foto: `${ASSETS_SUBDIR}/activo-bx40.png`,
}

const SIS = {
  percusion: 'sys-percusion',
  hidraulico: 'sys-hidraulico',
  retencion: 'sys-retencion',
} as const

const sistemas: Sistema[] = [
  {
    id: SIS.percusion,
    activoId: activo.id,
    nombre: 'Percusión',
    orden: 1,
    descripcion: 'Pistón, válvula distribuidora y componentes que generan el golpe.',
  },
  {
    id: SIS.hidraulico,
    activoId: activo.id,
    nombre: 'Hidráulico',
    orden: 2,
    descripcion: 'Acumulador, mangueras, filtros y válvulas de presión.',
  },
  {
    id: SIS.retencion,
    activoId: activo.id,
    nombre: 'Retención de herramienta',
    orden: 3,
    descripcion: 'Bujes, pasadores y topes que sostienen y guían la herramienta.',
  },
]

const colorSistema: Record<string, string> = {
  [SIS.percusion]: '#f59e0b',
  [SIS.hidraulico]: '#38bdf8',
  [SIS.retencion]: '#a78bfa',
}

// ---------- Piezas (seed compacto) ----------
type Rol = 'instalada' | 'desgastada'
interface PiezaSeed {
  id: string
  sistemaId: string
  partNumber: string
  nombre: string
  descripcionVisual: string
  specs: Spec[]
  criticidad: Criticidad
  vidaUtilHrs?: number
  procedimientoId?: string
  rolesExtra?: Rol[]
}

const seeds: PiezaSeed[] = [
  // --- Percusion ---
  {
    id: 'p-piston',
    sistemaId: SIS.percusion,
    partNumber: '3115-2010-00',
    nombre: 'Pistón de impacto',
    descripcionVisual:
      'Cilindro de acero pulido de ~600 mm, superficie espejo con dos bandas de sello mecanizadas ' +
      'cerca del extremo de golpeo; el otro extremo es plano y mate.',
    specs: [txt('Material', 'Acero forjado'), num('Largo', 600, 'mm'), num('Diámetro', 95, 'mm'), num('Peso', 28, 'kg')],
    criticidad: 3,
    vidaUtilHrs: 3000,
    procedimientoId: 'proc-cambio-sellos-piston',
    rolesExtra: ['instalada', 'desgastada'],
  },
  {
    id: 'p-sello-piston-alta',
    sistemaId: SIS.percusion,
    partNumber: '3115-2871-00',
    nombre: 'Sello de pistón alta presión',
    descripcionVisual:
      'Anillo de poliuretano ámbar de ~95 mm de diámetro, sección en U, labio interno biselado. ' +
      'Se instala en la ranura superior del pistón.',
    specs: [txt('Material', 'Poliuretano'), num('Diámetro', 95, 'mm'), txt('Dureza', '92 Shore A')],
    criticidad: 3,
    rolesExtra: ['desgastada'],
  },
  {
    id: 'p-sello-piston-baja',
    sistemaId: SIS.percusion,
    partNumber: '3115-2872-00',
    nombre: 'Sello de pistón baja presión',
    descripcionVisual:
      'Anillo de nitrilo negro de ~95 mm, sección cuadrada con resorte energizante metálico visible ' +
      'en la cara interior.',
    specs: [txt('Material', 'Nitrilo (NBR)'), num('Diámetro', 95, 'mm'), txt('Dureza', '80 Shore A')],
    criticidad: 2,
  },
  {
    id: 'p-buje-piston',
    sistemaId: SIS.percusion,
    partNumber: '3115-2015-00',
    nombre: 'Buje guía de pistón',
    descripcionVisual:
      'Manguito de bronce dorado de ~100 mm con ranuras de lubricación helicoidales en la cara interna.',
    specs: [txt('Material', 'Bronce SAE 660'), num('Diámetro exterior', 110, 'mm'), num('Diámetro interior', 95, 'mm')],
    criticidad: 2,
    vidaUtilHrs: 4000,
  },
  {
    id: 'p-valvula-distribuidora',
    sistemaId: SIS.percusion,
    partNumber: '3115-2050-00',
    nombre: 'Válvula distribuidora',
    descripcionVisual:
      'Carrete de acero cilíndrico de ~120 mm con varias gargantas anulares mecanizadas; superficie ' +
      'muy pulida, sin roscas.',
    specs: [txt('Material', 'Acero nitrurado'), num('Largo', 120, 'mm'), num('Diámetro', 55, 'mm')],
    criticidad: 3,
    rolesExtra: ['instalada'],
  },
  {
    id: 'p-resorte-valvula',
    sistemaId: SIS.percusion,
    partNumber: '3115-2051-00',
    nombre: 'Resorte de válvula',
    descripcionVisual:
      'Resorte helicoidal de compresión, alambre de ~4 mm, acabado fosfatado gris oscuro, ~60 mm de largo.',
    specs: [txt('Material', 'Acero de resorte'), num('Largo', 60, 'mm'), num('Hilos', 8)],
    criticidad: 1,
  },
  {
    id: 'p-tapa-trasera',
    sistemaId: SIS.percusion,
    partNumber: '3115-2001-00',
    nombre: 'Tapa trasera',
    descripcionVisual:
      'Bloque de acero rectangular con cuatro perforaciones pasantes en las esquinas y dos puertos ' +
      'hidráulicos roscados en la cara frontal.',
    specs: [txt('Material', 'Acero'), num('Peso', 22, 'kg')],
    criticidad: 2,
  },
  {
    id: 'p-perno-lateral',
    sistemaId: SIS.percusion,
    partNumber: '3115-2005-00',
    nombre: 'Perno lateral tensor',
    descripcionVisual:
      'Barra roscada larga de ~700 mm, acero negro, con tuerca hexagonal grande en un extremo.',
    specs: [txt('Material', 'Acero grado 12.9'), num('Largo', 700, 'mm'), txt('Rosca', 'M30')],
    criticidad: 2,
    procedimientoId: 'proc-servicio-500',
  },
  // --- Hidraulico ---
  {
    id: 'p-acumulador',
    sistemaId: SIS.hidraulico,
    partNumber: '3115-3010-00',
    nombre: 'Acumulador de alta presión',
    descripcionVisual:
      'Cuerpo cilíndrico de acero con tapa abombada y válvula de carga de gas en el tope; etiqueta ' +
      'de presión de nitrógeno visible.',
    specs: [txt('Material', 'Acero'), num('Presión de gas', 60, 'bar'), num('Capacidad', 500, 'cc')],
    criticidad: 3,
    procedimientoId: 'proc-cambio-acumulador',
    rolesExtra: ['instalada'],
  },
  {
    id: 'p-membrana-acumulador',
    sistemaId: SIS.hidraulico,
    partNumber: '3115-3011-00',
    nombre: 'Membrana de acumulador',
    descripcionVisual:
      'Diafragma de elastómero negro con forma de campana, flexible, con reborde de montaje grueso en el borde.',
    specs: [txt('Material', 'Elastómero HNBR'), num('Diámetro', 120, 'mm')],
    criticidad: 3,
  },
  {
    id: 'p-oring-acumulador',
    sistemaId: SIS.hidraulico,
    partNumber: '3115-3012-00',
    nombre: 'O-ring de acumulador',
    descripcionVisual: 'Junta tórica negra de ~120 mm de diámetro y ~5 mm de sección, superficie lisa.',
    specs: [txt('Material', 'Vitón (FKM)'), num('Diámetro', 120, 'mm'), num('Sección', 5, 'mm')],
    criticidad: 1,
  },
  {
    id: 'p-manguera-alta',
    sistemaId: SIS.hidraulico,
    partNumber: '3115-3020-00',
    nombre: 'Manguera de alta presión',
    descripcionVisual:
      'Manguera hidráulica negra con trenzado de acero visible en los extremos y racores prensados a 90 grados.',
    specs: [txt('Material', 'Caucho + malla acero'), num('Largo', 850, 'mm'), num('Presión máxima', 350, 'bar')],
    criticidad: 2,
  },
  {
    id: 'p-acople-hidraulico',
    sistemaId: SIS.hidraulico,
    partNumber: '3115-3021-00',
    nombre: 'Acople hidráulico rápido',
    descripcionVisual:
      'Conector metálico cromado tipo push-pull con collar moleteado deslizante y guardapolvo de goma.',
    specs: [txt('Material', 'Acero cromado'), txt('Rosca', 'M22'), num('Presión máxima', 350, 'bar')],
    criticidad: 2,
  },
  {
    id: 'p-valvula-alivio',
    sistemaId: SIS.hidraulico,
    partNumber: '3115-3030-00',
    nombre: 'Válvula de alivio de presión',
    descripcionVisual:
      'Cartucho hexagonal de latón con tornillo de ajuste sellado con laca roja y o-rings de colores en el cuerpo.',
    specs: [txt('Material', 'Latón'), num('Ajuste', 180, 'bar')],
    criticidad: 3,
  },
  {
    id: 'p-filtro-retorno',
    sistemaId: SIS.hidraulico,
    partNumber: '3115-3040-00',
    nombre: 'Filtro de retorno',
    descripcionVisual:
      'Cartucho cilíndrico con malla plisada blanca/beige y tapas metálicas en ambos extremos.',
    specs: [txt('Material', 'Celulosa/sintético'), num('Filtración', 10, 'µm')],
    criticidad: 1,
    vidaUtilHrs: 500,
    procedimientoId: 'proc-servicio-500',
    rolesExtra: ['desgastada'],
  },
  // --- Retencion de herramienta ---
  {
    id: 'p-buje-frontal',
    sistemaId: SIS.retencion,
    partNumber: '3115-4010-00',
    nombre: 'Buje frontal',
    descripcionVisual:
      'Casquillo de acero endurecido de gran diámetro (~150 mm) con desgaste típico en la cara interna; ' +
      'exterior mecanizado con chaflán.',
    specs: [txt('Material', 'Acero endurecido'), num('Diámetro exterior', 150, 'mm'), num('Diámetro interior', 100, 'mm')],
    criticidad: 3,
    vidaUtilHrs: 2000,
    procedimientoId: 'proc-cambio-buje-frontal',
    rolesExtra: ['instalada', 'desgastada'],
  },
  {
    id: 'p-pasador-retencion',
    sistemaId: SIS.retencion,
    partNumber: '3115-4011-00',
    nombre: 'Pasador de retención',
    descripcionVisual:
      'Barra cilíndrica de acero de ~180 mm con una cara plana rebajada a lo largo y un extremo achaflanado.',
    specs: [txt('Material', 'Acero'), num('Largo', 180, 'mm'), num('Diámetro', 40, 'mm')],
    criticidad: 2,
  },
  {
    id: 'p-tope-herramienta',
    sistemaId: SIS.retencion,
    partNumber: '3115-4012-00',
    nombre: 'Tope de herramienta',
    descripcionVisual:
      'Bloque de acero en forma de C que abraza la herramienta; caras de contacto con marcas de impacto.',
    specs: [txt('Material', 'Acero'), num('Peso', 6, 'kg')],
    criticidad: 2,
  },
  {
    id: 'p-guardapolvo',
    sistemaId: SIS.retencion,
    partNumber: '3115-4013-00',
    nombre: 'Guardapolvo frontal',
    descripcionVisual:
      'Anillo de goma flexible negro con labios concéntricos hacia adentro, sección delgada, ~110 mm.',
    specs: [txt('Material', 'Poliuretano'), num('Diámetro', 110, 'mm')],
    criticidad: 1,
  },
  {
    id: 'p-buje-inferior',
    sistemaId: SIS.retencion,
    partNumber: '3115-4014-00',
    nombre: 'Buje inferior',
    descripcionVisual:
      'Casquillo de bronce más corto que el frontal, superficie interna con ranuras axiales de lubricación.',
    specs: [txt('Material', 'Bronce'), num('Diámetro exterior', 140, 'mm'), num('Diámetro interior', 100, 'mm')],
    criticidad: 2,
    vidaUtilHrs: 2500,
  },
]

// ---------- Kits (autoridad de membresia) ----------
const kits: Kit[] = [
  {
    id: 'kit-servicio-500',
    nombre: 'Kit de servicio 500 hrs',
    partNumber: '3115-9000-00',
    piezaIds: [
      'p-piston',
      'p-sello-piston-alta',
      'p-oring-acumulador',
      'p-filtro-retorno',
      'p-perno-lateral',
      'p-pasador-retencion',
    ],
  },
  {
    id: 'kit-sellos-hidraulico',
    nombre: 'Kit de sellos hidráulico',
    partNumber: '3115-9100-00',
    piezaIds: [
      'p-sello-piston-alta',
      'p-sello-piston-baja',
      'p-membrana-acumulador',
      'p-oring-acumulador',
      'p-guardapolvo',
    ],
  },
]

// kitIds por pieza, derivado de los kits (fuente unica, no puede desincronizarse).
const kitIdsDePieza = new Map<string, string[]>()
for (const k of kits) {
  for (const pid of k.piezaIds) {
    const arr = kitIdsDePieza.get(pid) ?? []
    arr.push(k.id)
    kitIdsDePieza.set(pid, arr)
  }
}

// ---------- Registro de fotos a generar ----------
interface FotoSpec {
  ruta: string
  lineas: string[]
  color: string
}
const fotoSpecs = new Map<string, FotoSpec>()
function registrarFoto(ruta: string, lineas: string[], color: string) {
  if (!fotoSpecs.has(ruta)) fotoSpecs.set(ruta, { ruta, lineas, color })
}

// ---------- Construir piezas ----------
const piezas: Pieza[] = seeds.map((s) => {
  const norm = normalizePartNumber(s.partNumber)
  const color = colorSistema[s.sistemaId]
  const sisNombre = sistemas.find((x) => x.id === s.sistemaId)!.nombre
  const aislada = `${ASSETS_SUBDIR}/${norm}-aislada.png`
  registrarFoto(aislada, [activo.modelo, sisNombre, s.nombre, s.partNumber, 'AISLADA'], color)
  const fotos: Pieza['fotos'] = { aislada: [aislada] }
  for (const rol of s.rolesExtra ?? []) {
    const ruta = `${ASSETS_SUBDIR}/${norm}-${rol}.png`
    registrarFoto(ruta, [activo.modelo, sisNombre, s.nombre, s.partNumber, rol.toUpperCase()], color)
    fotos[rol] = ruta
  }
  return {
    id: s.id,
    sistemaId: s.sistemaId,
    partNumber: s.partNumber,
    partNumberNorm: norm,
    nombre: s.nombre,
    descripcionVisual: s.descripcionVisual,
    specs: s.specs,
    criticidad: s.criticidad,
    vidaUtilHrs: s.vidaUtilHrs,
    fotos,
    procedimientoId: s.procedimientoId,
    kitIds: kitIdsDePieza.get(s.id) ?? [],
  }
})

// activo foto
registrarFoto(activo.foto!, [activo.nombre, activo.categoria, activo.modelo], '#22c55e')

const fotoDe = (norm: string, rol: Rol | 'aislada') =>
  rol === 'aislada' ? `${ASSETS_SUBDIR}/${norm}-aislada.png` : `${ASSETS_SUBDIR}/${norm}-${rol}.png`

// ---------- Aliases (los tres tipos) ----------
const aliasesRaw: Omit<PartNumberAlias, 'partNumberNorm'>[] = [
  {
    piezaId: 'p-buje-frontal',
    partNumber: '3115-4009-00',
    tipo: 'reemplazado_por',
    nota: 'Número antiguo, reemplazado por 3115-4010-00',
  },
  { piezaId: 'p-filtro-retorno', partNumber: 'HF-3040', tipo: 'compatible', nota: 'Equivalente aftermarket' },
  { piezaId: 'p-oring-acumulador', partNumber: 'OR-3012', tipo: 'oem' },
  {
    piezaId: 'p-sello-piston-alta',
    partNumber: 'SPA-2871',
    tipo: 'compatible',
    nota: 'Referencia de proveedor alternativo',
  },
]
const aliases: PartNumberAlias[] = aliasesRaw.map((a) => ({
  ...a,
  partNumberNorm: normalizePartNumber(a.partNumber),
}))

// ---------- Procedimientos ----------
const procedimientos: Procedimiento[] = [
  {
    id: 'proc-cambio-sellos-piston',
    titulo: 'Cambio de sellos de pistón',
    seguridad: [
      'Despresurizar el circuito hidráulico y bloquear el equipo (LOTO) antes de abrir.',
      'El acumulador puede conservar presión residual de gas: descargarlo primero.',
      'Piezas pesadas: usar apoyo mecánico para el pistón (28 kg).',
    ],
    herramientas: ['Llave dinamométrica', 'Extractor de sellos', 'Juego de llaves Allen', 'Grasa de montaje'],
    pasos: [
      { orden: 1, texto: 'Despresurizar el circuito y desconectar las mangueras.', advertencia: 'El aceite a presión puede penetrar la piel.' },
      { orden: 2, texto: 'Aflojar y retirar los pernos laterales en secuencia cruzada.' },
      { orden: 3, texto: 'Extraer el pistón y retirar los sellos gastados.', foto: fotoDe('3115201000', 'desgastada') },
      { orden: 4, texto: 'Limpiar las ranuras e instalar los sellos nuevos del kit con grasa de montaje.', foto: fotoDe('3115287100', 'aislada') },
      { orden: 5, texto: 'Montar el pistón y apretar los pernos laterales al torque indicado.', torqueNm: 320, advertencia: 'Apretar en secuencia cruzada, en dos etapas.' },
    ],
    duracionMin: 90,
    kitRecomendadoId: 'kit-sellos-hidraulico',
  },
  {
    id: 'proc-cambio-buje-frontal',
    titulo: 'Cambio de buje frontal',
    seguridad: [
      'Bloquear el equipo (LOTO) y retirar la herramienta antes de comenzar.',
      'Bordes con rebabas: usar guantes de protección.',
    ],
    herramientas: ['Prensa hidráulica o extractor de bujes', 'Mazo de goma', 'Calibrador'],
    pasos: [
      { orden: 1, texto: 'Retirar el pasador de retención y la herramienta.' },
      { orden: 2, texto: 'Extraer el buje frontal gastado con el extractor.', foto: fotoDe('3115401000', 'desgastada') },
      { orden: 3, texto: 'Medir el alojamiento y verificar tolerancia antes de montar.' },
      { orden: 4, texto: 'Instalar el buje nuevo a presión, alineado con la marca.', foto: fotoDe('3115401000', 'instalada') },
    ],
    duracionMin: 60,
  },
  {
    id: 'proc-servicio-500',
    titulo: 'Servicio programado 500 hrs',
    seguridad: [
      'Bloquear el equipo (LOTO) antes de intervenir.',
      'Descargar presión de gas y aceite antes de abrir componentes.',
    ],
    herramientas: ['Llave dinamométrica', 'Recipiente para aceite', 'Kit de servicio 500 hrs'],
    pasos: [
      { orden: 1, texto: 'Reemplazar el filtro de retorno.', foto: fotoDe('3115304000', 'desgastada') },
      { orden: 2, texto: 'Inspeccionar y reemplazar sellos y o-rings del kit.' },
      { orden: 3, texto: 'Verificar el torque de los pernos laterales.', torqueNm: 320 },
      { orden: 4, texto: 'Registrar horas y dejar constancia del servicio.' },
    ],
    duracionMin: 120,
    kitRecomendadoId: 'kit-servicio-500',
  },
  {
    id: 'proc-cambio-acumulador',
    titulo: 'Recarga / cambio de acumulador',
    seguridad: [
      'PELIGRO: el acumulador contiene gas a alta presión. Descargar el nitrógeno por la válvula antes de desmontar.',
      'Usar solo nitrógeno seco; nunca oxígeno ni aire comprimido.',
      'Protección ocular obligatoria.',
    ],
    herramientas: ['Kit de carga de nitrógeno', 'Manómetro de alta', 'Llave de acumulador'],
    pasos: [
      { orden: 1, texto: 'Descargar por completo la presión de gas por la válvula de carga.', advertencia: 'No aflojar ningún perno con presión en el acumulador.' },
      { orden: 2, texto: 'Desmontar el acumulador y reemplazar membrana y o-ring.', foto: fotoDe('3115301000', 'instalada') },
      { orden: 3, texto: 'Montar y recargar con nitrógeno a la presión especificada.', torqueNm: 90 },
      { orden: 4, texto: 'Verificar ausencia de fugas y registrar la presión final.' },
    ],
    duracionMin: 75,
  },
]

// ---------- Fallas (arboles de 2-3 niveles) ----------
const fallas: Falla[] = [
  {
    id: 'f-perdida-presion',
    sistemaId: SIS.percusion,
    sintoma: 'Pierde presión de impacto',
    arbol: {
      pregunta: '¿El manómetro de línea marca presión normal?',
      opciones: [
        {
          etiqueta: 'Sí, presión normal',
          siguiente: {
            pregunta: '¿El pistón golpea pero con fuerza reducida?',
            opciones: [
              {
                etiqueta: 'Sí, golpea débil',
                siguiente: {
                  resultado: {
                    piezaIds: ['p-sello-piston-alta', 'p-piston'],
                    procedimientoId: 'proc-cambio-sellos-piston',
                    nota: 'El desgaste de los sellos de pistón reduce el impacto.',
                  },
                },
              },
              {
                etiqueta: 'No golpea',
                siguiente: {
                  resultado: {
                    piezaIds: ['p-valvula-distribuidora'],
                    procedimientoId: 'proc-cambio-sellos-piston',
                    nota: 'Revisar la válvula distribuidora: puede estar trabada.',
                  },
                },
              },
            ],
          },
        },
        {
          etiqueta: 'No, presión baja',
          siguiente: {
            resultado: {
              piezaIds: ['p-valvula-alivio', 'p-acumulador'],
              procedimientoId: 'proc-cambio-acumulador',
              nota: 'Pérdida en el circuito hidráulico o acumulador descargado.',
            },
          },
        },
      ],
    },
  },
  {
    id: 'f-ruido-metalico',
    sistemaId: SIS.percusion,
    sintoma: 'Ruido metálico anormal',
    arbol: {
      pregunta: '¿El ruido aparece solo al golpear?',
      opciones: [
        {
          etiqueta: 'Sí, al golpear',
          siguiente: {
            resultado: {
              piezaIds: ['p-buje-piston', 'p-piston'],
              procedimientoId: 'proc-cambio-sellos-piston',
              nota: 'Juego excesivo entre pistón y buje guía.',
            },
          },
        },
        {
          etiqueta: 'No, también en vacío',
          siguiente: {
            resultado: {
              piezaIds: ['p-perno-lateral'],
              procedimientoId: 'proc-servicio-500',
              nota: 'Revisar torque de pernos laterales.',
            },
          },
        },
      ],
    },
  },
  {
    id: 'f-fuga-aceite',
    sistemaId: SIS.hidraulico,
    sintoma: 'Fuga de aceite en el cuerpo',
    arbol: {
      pregunta: '¿De dónde proviene la fuga?',
      opciones: [
        {
          etiqueta: 'De las mangueras o acoples',
          siguiente: {
            resultado: {
              piezaIds: ['p-manguera-alta', 'p-acople-hidraulico'],
              procedimientoId: 'proc-servicio-500',
              nota: 'Revisar racores y reemplazar manguera si está fisurada.',
            },
          },
        },
        {
          etiqueta: 'Del frente (herramienta)',
          siguiente: {
            resultado: {
              piezaIds: ['p-sello-piston-baja', 'p-guardapolvo'],
              procedimientoId: 'proc-cambio-sellos-piston',
              nota: 'Sellos de baja presión o guardapolvo vencidos.',
            },
          },
        },
      ],
    },
  },
  {
    id: 'f-sobrecalentamiento',
    sistemaId: SIS.hidraulico,
    sintoma: 'Sobrecalentamiento del sistema',
    arbol: {
      pregunta: '¿El filtro de retorno está al día?',
      opciones: [
        {
          etiqueta: 'No / no sé',
          siguiente: {
            resultado: {
              piezaIds: ['p-filtro-retorno'],
              procedimientoId: 'proc-servicio-500',
              nota: 'Filtro saturado restringe el retorno y calienta el aceite.',
            },
          },
        },
        {
          etiqueta: 'Sí, recién cambiado',
          siguiente: {
            resultado: {
              piezaIds: ['p-valvula-alivio'],
              procedimientoId: 'proc-cambio-acumulador',
              nota: 'Válvula de alivio mal ajustada o pegada.',
            },
          },
        },
      ],
    },
  },
  {
    id: 'f-herramienta-trabada',
    sistemaId: SIS.retencion,
    sintoma: 'La herramienta se traba',
    arbol: {
      resultado: {
        piezaIds: ['p-buje-frontal', 'p-pasador-retencion'],
        procedimientoId: 'proc-cambio-buje-frontal',
        nota: 'Buje frontal ovalado o pasador deformado impiden el deslizamiento.',
      },
    },
  },
  {
    id: 'f-juego-excesivo',
    sistemaId: SIS.retencion,
    sintoma: 'Juego excesivo en la herramienta',
    arbol: {
      pregunta: '¿El juego es lateral o axial?',
      opciones: [
        {
          etiqueta: 'Lateral',
          siguiente: {
            resultado: {
              piezaIds: ['p-buje-frontal', 'p-buje-inferior'],
              procedimientoId: 'proc-cambio-buje-frontal',
              nota: 'Bujes de guía desgastados.',
            },
          },
        },
        {
          etiqueta: 'Axial (entra y sale)',
          siguiente: {
            resultado: {
              piezaIds: ['p-tope-herramienta', 'p-pasador-retencion'],
              procedimientoId: 'proc-cambio-buje-frontal',
              nota: 'Tope o pasador de retención gastados.',
            },
          },
        },
      ],
    },
  },
]

// ---------- Generar fotos PNG ----------
function generarFotos(): AssetManifest[] {
  const assetsDir = join(OUT_DIR, ASSETS_SUBDIR)
  mkdirSync(assetsDir, { recursive: true })
  const manifest: AssetManifest[] = []
  for (const spec of [...fotoSpecs.values()].sort((a, b) => a.ruta.localeCompare(b.ruta))) {
    const buf = dibujar(spec.lineas, spec.color)
    const abs = join(OUT_DIR, spec.ruta)
    writeFileSync(abs, buf)
    const hash = createHash('sha256').update(buf).digest('hex')
    const kb = Math.round((statSync(abs).size / 1024) * 10) / 10
    manifest.push({ ruta: spec.ruta, hash, kb })
  }
  return manifest
}

function dibujar(lineas: string[], color: string): Buffer {
  const w = 800
  const h = 600
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#111827'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = color
  ctx.lineWidth = 10
  ctx.strokeRect(20, 20, w - 40, h - 40)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const total = lineas.length
  lineas.forEach((linea, i) => {
    const esTitulo = i === 0
    ctx.fillStyle = esTitulo ? color : '#e5e7eb'
    ctx.font = `${esTitulo ? 'bold ' : ''}${esTitulo ? 40 : 30}px Arial`
    const y = h / 2 - ((total - 1) * 52) / 2 + i * 52
    ctx.fillText(linea, w / 2, y)
  })
  ctx.fillStyle = '#6b7280'
  ctx.font = '20px Arial'
  ctx.fillText('PLACEHOLDER - contenido ficticio de demo', w / 2, h - 50)
  return canvas.toBuffer('image/png')
}

// ---------- Ensamblar y escribir ----------
if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true })
mkdirSync(OUT_DIR, { recursive: true })

const assets = generarFotos()

const pack: Pack = {
  packId: 'hidromax-bx40',
  version: 2,
  activo,
  sistemas,
  piezas,
  aliases,
  fallas,
  procedimientos,
  kits,
  assets,
}

writeFileSync(join(OUT_DIR, 'pack.json'), JSON.stringify(pack, null, 2) + '\n', 'utf8')

// Registro de packs disponibles para el gestor de descargas (Fase 1).
const packJsonKb = statSync(join(OUT_DIR, 'pack.json')).size / 1024
const sizeMb = Math.round(((packJsonKb + assets.reduce((a, x) => a + x.kb, 0)) / 1024) * 100) / 100
const indexEntry = {
  packId: pack.packId,
  path: 'hidromax-bx40',
  nombre: activo.nombre,
  categoria: activo.categoria,
  version: pack.version,
  piezas: piezas.length,
  sizeMb,
}
writeFileSync(join(OUT_DIR, '..', 'index.json'), JSON.stringify([indexEntry], null, 2) + '\n', 'utf8')

const totalMb = Math.round((assets.reduce((a, x) => a + x.kb, 0) / 1024) * 100) / 100
console.log(
  `Pack generado: ${piezas.length} piezas, ${kits.length} kits, ${fallas.length} fallas, ` +
    `${procedimientos.length} procedimientos, ${assets.length} fotos (${totalMb} MB) -> ${join('app/public/packs/hidromax-bx40', 'pack.json')}`,
)
