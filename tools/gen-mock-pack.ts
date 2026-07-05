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
} from '../app/src/domain/types'
import { normalizePartNumber } from '../app/src/domain/partNumber'

const here = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(here, '../app/public/packs/hidromax-bx40')
const ASSETS_SUBDIR = 'assets'

// ---------- Activo y sistemas ----------
const activo: Activo = {
  id: 'act-bx40',
  nombre: 'HidroMax BX-40',
  modelo: 'BX-40',
  categoria: 'Martillo hidraulico',
  descripcion:
    'Martillo hidraulico de rango medio para excavadora 18-26 t. Energia de impacto 4000 J, ' +
    'frecuencia 400-900 golpes/min. Modelo ficticio de demostracion.',
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
    nombre: 'Percusion',
    orden: 1,
    descripcion: 'Piston, valvula distribuidora y componentes que generan el golpe.',
  },
  {
    id: SIS.hidraulico,
    activoId: activo.id,
    nombre: 'Hidraulico',
    orden: 2,
    descripcion: 'Acumulador, mangueras, filtros y valvulas de presion.',
  },
  {
    id: SIS.retencion,
    activoId: activo.id,
    nombre: 'Retencion de herramienta',
    orden: 3,
    descripcion: 'Bujes, pasadores y topes que sostienen y guian la herramienta.',
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
  specs: Record<string, string | number>
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
    nombre: 'Piston de impacto',
    descripcionVisual:
      'Cilindro de acero pulido de ~600 mm, superficie espejo con dos bandas de sello mecanizadas ' +
      'cerca del extremo de golpeo; el otro extremo es plano y mate.',
    specs: { material: 'Acero forjado', largoMm: 600, diametroMm: 95, pesoKg: 28 },
    criticidad: 3,
    vidaUtilHrs: 3000,
    procedimientoId: 'proc-cambio-sellos-piston',
    rolesExtra: ['instalada', 'desgastada'],
  },
  {
    id: 'p-sello-piston-alta',
    sistemaId: SIS.percusion,
    partNumber: '3115-2871-00',
    nombre: 'Sello de piston alta presion',
    descripcionVisual:
      'Anillo de poliuretano ambar de ~95 mm de diametro, seccion en U, labio interno biselado. ' +
      'Se instala en la ranura superior del piston.',
    specs: { material: 'Poliuretano', diametroMm: 95, dureza: '92 Shore A' },
    criticidad: 3,
    rolesExtra: ['desgastada'],
  },
  {
    id: 'p-sello-piston-baja',
    sistemaId: SIS.percusion,
    partNumber: '3115-2872-00',
    nombre: 'Sello de piston baja presion',
    descripcionVisual:
      'Anillo de nitrilo negro de ~95 mm, seccion cuadrada con resorte energizante metalico visible ' +
      'en la cara interior.',
    specs: { material: 'Nitrilo (NBR)', diametroMm: 95, dureza: '80 Shore A' },
    criticidad: 2,
  },
  {
    id: 'p-buje-piston',
    sistemaId: SIS.percusion,
    partNumber: '3115-2015-00',
    nombre: 'Buje guia de piston',
    descripcionVisual:
      'Manguito de bronce dorado de ~100 mm con ranuras de lubricacion helicoidales en la cara interna.',
    specs: { material: 'Bronce SAE 660', diametroExtMm: 110, diametroIntMm: 95 },
    criticidad: 2,
    vidaUtilHrs: 4000,
  },
  {
    id: 'p-valvula-distribuidora',
    sistemaId: SIS.percusion,
    partNumber: '3115-2050-00',
    nombre: 'Valvula distribuidora',
    descripcionVisual:
      'Carrete de acero cilindrico de ~120 mm con varias gargantas anulares mecanizadas; superficie ' +
      'muy pulida, sin roscas.',
    specs: { material: 'Acero nitrurado', largoMm: 120, diametroMm: 55 },
    criticidad: 3,
    rolesExtra: ['instalada'],
  },
  {
    id: 'p-resorte-valvula',
    sistemaId: SIS.percusion,
    partNumber: '3115-2051-00',
    nombre: 'Resorte de valvula',
    descripcionVisual:
      'Resorte helicoidal de compresion, alambre de ~4 mm, acabado fosfatado gris oscuro, ~60 mm de largo.',
    specs: { material: 'Acero de resorte', largoMm: 60, hilos: 8 },
    criticidad: 1,
  },
  {
    id: 'p-tapa-trasera',
    sistemaId: SIS.percusion,
    partNumber: '3115-2001-00',
    nombre: 'Tapa trasera',
    descripcionVisual:
      'Bloque de acero rectangular con cuatro perforaciones pasantes en las esquinas y dos puertos ' +
      'hidraulicos roscados en la cara frontal.',
    specs: { material: 'Acero', pesoKg: 22 },
    criticidad: 2,
  },
  {
    id: 'p-perno-lateral',
    sistemaId: SIS.percusion,
    partNumber: '3115-2005-00',
    nombre: 'Perno lateral tensor',
    descripcionVisual:
      'Barra roscada larga de ~700 mm, acero negro, con tuerca hexagonal grande en un extremo.',
    specs: { material: 'Acero grado 12.9', largoMm: 700, roscaMm: 'M30' },
    criticidad: 2,
    procedimientoId: 'proc-servicio-500',
  },
  // --- Hidraulico ---
  {
    id: 'p-acumulador',
    sistemaId: SIS.hidraulico,
    partNumber: '3115-3010-00',
    nombre: 'Acumulador de alta presion',
    descripcionVisual:
      'Cuerpo cilindrico de acero con tapa abombada y valvula de carga de gas en el tope; etiqueta ' +
      'de presion de nitrogeno visible.',
    specs: { material: 'Acero', presionGasBar: 60, capacidadCc: 500 },
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
      'Diafragma de elastomero negro con forma de campana, flexible, con reborde de montaje grueso en el borde.',
    specs: { material: 'Elastomero HNBR', diametroMm: 120 },
    criticidad: 3,
  },
  {
    id: 'p-oring-acumulador',
    sistemaId: SIS.hidraulico,
    partNumber: '3115-3012-00',
    nombre: 'O-ring de acumulador',
    descripcionVisual: 'Junta torica negra de ~120 mm de diametro y ~5 mm de seccion, superficie lisa.',
    specs: { material: 'Viton (FKM)', diametroMm: 120, seccionMm: 5 },
    criticidad: 1,
  },
  {
    id: 'p-manguera-alta',
    sistemaId: SIS.hidraulico,
    partNumber: '3115-3020-00',
    nombre: 'Manguera de alta presion',
    descripcionVisual:
      'Manguera hidraulica negra con trenzado de acero visible en los extremos y racores prensados a 90 grados.',
    specs: { material: 'Caucho + malla acero', largoMm: 850, presionMaxBar: 350 },
    criticidad: 2,
  },
  {
    id: 'p-acople-hidraulico',
    sistemaId: SIS.hidraulico,
    partNumber: '3115-3021-00',
    nombre: 'Acople hidraulico rapido',
    descripcionVisual:
      'Conector metalico cromado tipo push-pull con collar moleteado deslizante y guardapolvo de goma.',
    specs: { material: 'Acero cromado', roscaMm: 'M22', presionMaxBar: 350 },
    criticidad: 2,
  },
  {
    id: 'p-valvula-alivio',
    sistemaId: SIS.hidraulico,
    partNumber: '3115-3030-00',
    nombre: 'Valvula de alivio de presion',
    descripcionVisual:
      'Cartucho hexagonal de laton con tornillo de ajuste sellado con laca roja y o-rings de colores en el cuerpo.',
    specs: { material: 'Laton', ajusteBar: 180 },
    criticidad: 3,
  },
  {
    id: 'p-filtro-retorno',
    sistemaId: SIS.hidraulico,
    partNumber: '3115-3040-00',
    nombre: 'Filtro de retorno',
    descripcionVisual:
      'Cartucho cilindrico con malla plisada blanca/beige y tapas metalicas en ambos extremos.',
    specs: { material: 'Celulosa/sintetico', micras: 10, vidaUtilHrs: 500 },
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
      'Casquillo de acero endurecido de gran diametro (~150 mm) con desgaste tipico en la cara interna; ' +
      'exterior mecanizado con chaflan.',
    specs: { material: 'Acero endurecido', diametroExtMm: 150, diametroIntMm: 100 },
    criticidad: 3,
    vidaUtilHrs: 2000,
    procedimientoId: 'proc-cambio-buje-frontal',
    rolesExtra: ['instalada', 'desgastada'],
  },
  {
    id: 'p-pasador-retencion',
    sistemaId: SIS.retencion,
    partNumber: '3115-4011-00',
    nombre: 'Pasador de retencion',
    descripcionVisual:
      'Barra cilindrica de acero de ~180 mm con una cara plana rebajada a lo largo y un extremo achaflanado.',
    specs: { material: 'Acero', largoMm: 180, diametroMm: 40 },
    criticidad: 2,
  },
  {
    id: 'p-tope-herramienta',
    sistemaId: SIS.retencion,
    partNumber: '3115-4012-00',
    nombre: 'Tope de herramienta',
    descripcionVisual:
      'Bloque de acero en forma de C que abraza la herramienta; caras de contacto con marcas de impacto.',
    specs: { material: 'Acero', pesoKg: 6 },
    criticidad: 2,
  },
  {
    id: 'p-guardapolvo',
    sistemaId: SIS.retencion,
    partNumber: '3115-4013-00',
    nombre: 'Guardapolvo frontal',
    descripcionVisual:
      'Anillo de goma flexible negro con labios concentricos hacia adentro, seccion delgada, ~110 mm.',
    specs: { material: 'Poliuretano', diametroMm: 110 },
    criticidad: 1,
  },
  {
    id: 'p-buje-inferior',
    sistemaId: SIS.retencion,
    partNumber: '3115-4014-00',
    nombre: 'Buje inferior',
    descripcionVisual:
      'Casquillo de bronce mas corto que el frontal, superficie interna con ranuras axiales de lubricacion.',
    specs: { material: 'Bronce', diametroExtMm: 140, diametroIntMm: 100 },
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
    nombre: 'Kit de sellos hidraulico',
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
    nota: 'Numero antiguo, reemplazado por 3115-4010-00',
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
    titulo: 'Cambio de sellos de piston',
    seguridad: [
      'Despresurizar el circuito hidraulico y bloquear el equipo (LOTO) antes de abrir.',
      'El acumulador puede conservar presion residual de gas: descargarlo primero.',
      'Piezas pesadas: usar apoyo mecanico para el piston (28 kg).',
    ],
    herramientas: ['Llave dinamometrica', 'Extractor de sellos', 'Juego de llaves Allen', 'Grasa de montaje'],
    pasos: [
      { orden: 1, texto: 'Despresurizar el circuito y desconectar las mangueras.', advertencia: 'El aceite a presion puede penetrar la piel.' },
      { orden: 2, texto: 'Aflojar y retirar los pernos laterales en secuencia cruzada.' },
      { orden: 3, texto: 'Extraer el piston y retirar los sellos gastados.', foto: fotoDe('3115201000', 'desgastada') },
      { orden: 4, texto: 'Limpiar las ranuras e instalar los sellos nuevos del kit con grasa de montaje.', foto: fotoDe('3115287100', 'aislada') },
      { orden: 5, texto: 'Montar el piston y apretar los pernos laterales al torque indicado.', torqueNm: 320, advertencia: 'Apretar en secuencia cruzada, en dos etapas.' },
    ],
    duracionMin: 90,
    kitRecomendadoId: 'kit-sellos-hidraulico',
  },
  {
    id: 'proc-cambio-buje-frontal',
    titulo: 'Cambio de buje frontal',
    seguridad: [
      'Bloquear el equipo (LOTO) y retirar la herramienta antes de comenzar.',
      'Bordes con rebabas: usar guantes de proteccion.',
    ],
    herramientas: ['Prensa hidraulica o extractor de bujes', 'Mazo de goma', 'Calibrador'],
    pasos: [
      { orden: 1, texto: 'Retirar el pasador de retencion y la herramienta.' },
      { orden: 2, texto: 'Extraer el buje frontal gastado con el extractor.', foto: fotoDe('3115401000', 'desgastada') },
      { orden: 3, texto: 'Medir el alojamiento y verificar tolerancia antes de montar.' },
      { orden: 4, texto: 'Instalar el buje nuevo a presion, alineado con la marca.', foto: fotoDe('3115401000', 'instalada') },
    ],
    duracionMin: 60,
  },
  {
    id: 'proc-servicio-500',
    titulo: 'Servicio programado 500 hrs',
    seguridad: [
      'Bloquear el equipo (LOTO) antes de intervenir.',
      'Descargar presion de gas y aceite antes de abrir componentes.',
    ],
    herramientas: ['Llave dinamometrica', 'Recipiente para aceite', 'Kit de servicio 500 hrs'],
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
      'PELIGRO: el acumulador contiene gas a alta presion. Descargar el nitrogeno por la valvula antes de desmontar.',
      'Usar solo nitrogeno seco; nunca oxigeno ni aire comprimido.',
      'Proteccion ocular obligatoria.',
    ],
    herramientas: ['Kit de carga de nitrogeno', 'Manometro de alta', 'Llave de acumulador'],
    pasos: [
      { orden: 1, texto: 'Descargar por completo la presion de gas por la valvula de carga.', advertencia: 'No aflojar ningun perno con presion en el acumulador.' },
      { orden: 2, texto: 'Desmontar el acumulador y reemplazar membrana y o-ring.', foto: fotoDe('3115301000', 'instalada') },
      { orden: 3, texto: 'Montar y recargar con nitrogeno a la presion especificada.', torqueNm: 90 },
      { orden: 4, texto: 'Verificar ausencia de fugas y registrar la presion final.' },
    ],
    duracionMin: 75,
  },
]

// ---------- Fallas (arboles de 2-3 niveles) ----------
const fallas: Falla[] = [
  {
    id: 'f-perdida-presion',
    sistemaId: SIS.percusion,
    sintoma: 'Pierde presion de impacto',
    arbol: {
      pregunta: 'El manometro de linea marca presion normal?',
      opciones: [
        {
          etiqueta: 'Si, presion normal',
          siguiente: {
            pregunta: 'El piston golpea pero con fuerza reducida?',
            opciones: [
              {
                etiqueta: 'Si, golpea debil',
                siguiente: {
                  resultado: {
                    piezaIds: ['p-sello-piston-alta', 'p-piston'],
                    procedimientoId: 'proc-cambio-sellos-piston',
                    nota: 'El desgaste de los sellos de piston reduce el impacto.',
                  },
                },
              },
              {
                etiqueta: 'No golpea',
                siguiente: {
                  resultado: {
                    piezaIds: ['p-valvula-distribuidora'],
                    procedimientoId: 'proc-cambio-sellos-piston',
                    nota: 'Revisar la valvula distribuidora: puede estar trabada.',
                  },
                },
              },
            ],
          },
        },
        {
          etiqueta: 'No, presion baja',
          siguiente: {
            resultado: {
              piezaIds: ['p-valvula-alivio', 'p-acumulador'],
              procedimientoId: 'proc-cambio-acumulador',
              nota: 'Perdida en el circuito hidraulico o acumulador descargado.',
            },
          },
        },
      ],
    },
  },
  {
    id: 'f-ruido-metalico',
    sistemaId: SIS.percusion,
    sintoma: 'Ruido metalico anormal',
    arbol: {
      pregunta: 'El ruido aparece solo al golpear?',
      opciones: [
        {
          etiqueta: 'Si, al golpear',
          siguiente: {
            resultado: {
              piezaIds: ['p-buje-piston', 'p-piston'],
              procedimientoId: 'proc-cambio-sellos-piston',
              nota: 'Juego excesivo entre piston y buje guia.',
            },
          },
        },
        {
          etiqueta: 'No, tambien en vacio',
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
      pregunta: 'De donde proviene la fuga?',
      opciones: [
        {
          etiqueta: 'De las mangueras o acoples',
          siguiente: {
            resultado: {
              piezaIds: ['p-manguera-alta', 'p-acople-hidraulico'],
              procedimientoId: 'proc-servicio-500',
              nota: 'Revisar racores y reemplazar manguera si esta fisurada.',
            },
          },
        },
        {
          etiqueta: 'Del frente (herramienta)',
          siguiente: {
            resultado: {
              piezaIds: ['p-sello-piston-baja', 'p-guardapolvo'],
              procedimientoId: 'proc-cambio-sellos-piston',
              nota: 'Sellos de baja presion o guardapolvo vencidos.',
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
      pregunta: 'El filtro de retorno esta al dia?',
      opciones: [
        {
          etiqueta: 'No / no se',
          siguiente: {
            resultado: {
              piezaIds: ['p-filtro-retorno'],
              procedimientoId: 'proc-servicio-500',
              nota: 'Filtro saturado restringe el retorno y calienta el aceite.',
            },
          },
        },
        {
          etiqueta: 'Si, recien cambiado',
          siguiente: {
            resultado: {
              piezaIds: ['p-valvula-alivio'],
              procedimientoId: 'proc-cambio-acumulador',
              nota: 'Valvula de alivio mal ajustada o pegada.',
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
      pregunta: 'El juego es lateral o axial?',
      opciones: [
        {
          etiqueta: 'Lateral',
          siguiente: {
            resultado: {
              piezaIds: ['p-buje-frontal', 'p-buje-inferior'],
              procedimientoId: 'proc-cambio-buje-frontal',
              nota: 'Bujes de guia desgastados.',
            },
          },
        },
        {
          etiqueta: 'Axial (entra y sale)',
          siguiente: {
            resultado: {
              piezaIds: ['p-tope-herramienta', 'p-pasador-retencion'],
              procedimientoId: 'proc-cambio-buje-frontal',
              nota: 'Tope o pasador de retencion gastados.',
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
  version: 1,
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

const totalMb = Math.round((assets.reduce((a, x) => a + x.kb, 0) / 1024) * 100) / 100
console.log(
  `Pack generado: ${piezas.length} piezas, ${kits.length} kits, ${fallas.length} fallas, ` +
    `${procedimientos.length} procedimientos, ${assets.length} fotos (${totalMb} MB) -> ${join('app/public/packs/hidromax-bx40', 'pack.json')}`,
)
