// Contratos de dominio. Terminos NEUTROS a proposito: la app no sabe de mineria.
// Todo lo especifico del rubro vive en vertical.config.json + content packs.
// Cambiar de rubro = nuevo config + nuevos packs, cero cambio de codigo.

export type Criticidad = 1 | 2 | 3; // 3 = detiene faena/operacion
export type TipoAlias = 'oem' | 'compatible' | 'reemplazado_por';

// ---------- Configuracion de vertical (white-label) ----------
export interface VerticalConfig {
  verticalId: string; // 'mineria-cl'
  nombre: string; // 'Soporte Terreno Minero'
  terminologia: {
    // llaves fijas, valores por rubro
    activo: string; // 'Equipo' | 'Vehiculo' | 'Instalacion'
    sitio: string; // 'Faena' | 'Taller' | 'Planta'
    sistema: string;
    pieza: string;
    falla: string;
    // Etiqueta visible por nivel de criticidad. El color lo pone el componente
    // (es severidad visual); el texto es de dominio y por eso vive en el config.
    criticidad: Record<Criticidad, string>; // { 1: 'Menor', 2: 'Importante', 3: 'Detiene faena' }
  };
  branding: {
    logoUrl: string;
    colorPrimario: string;
    colorAcento: string;
  };
  pedidos: {
    whatsapp?: string;
    email?: string;
    nombreDistribuidor: string;
  };
}

// ---------- Pack de contenido (por activo) ----------
export interface Pack {
  packId: string; // 'epiroc-cop-1838'
  version: number;
  activo: Activo;
  sistemas: Sistema[];
  piezas: Pieza[];
  aliases: PartNumberAlias[];
  fallas: Falla[];
  procedimientos: Procedimiento[];
  kits: Kit[];
  assets: AssetManifest[];
}

export interface Activo {
  id: string;
  nombre: string; // 'HidroMax BX-40'
  modelo: string; // 'BX-40'
  categoria: string; // texto de dominio: vive en el pack, no en el codigo
  descripcion?: string;
  foto?: string;
}

export interface Sistema {
  id: string;
  activoId: string;
  nombre: string; // 'Percusion'
  orden: number;
  descripcion?: string;
}

// Especificacion tecnica lista para mostrar: etiqueta legible + valor + unidad
// opcional. El pack trae el texto ya formateado; la app no mapea llaves a labels.
export interface Spec {
  etiqueta: string; // 'Diametro exterior'
  valor: string | number; // 150
  unidad?: string; // 'mm'
}

export interface Pieza {
  id: string;
  sistemaId: string;
  partNumber: string; // formateado para mostrar
  partNumberNorm: string; // solo [a-z0-9], para busqueda
  nombre: string;
  descripcionVisual: string; // insumo del RAG de la Fase 5
  specs: Spec[];
  criticidad: Criticidad;
  vidaUtilHrs?: number;
  fotos: {
    aislada: string[];
    instalada?: string;
    desgastada?: string;
  };
  procedimientoId?: string;
  kitIds: string[];
}

export interface PartNumberAlias {
  piezaId: string;
  partNumber: string;
  partNumberNorm: string;
  tipo: TipoAlias;
  nota?: string; // ej: 'reemplaza a 3115-2871-00'
}

export interface Falla {
  id: string;
  sistemaId: string;
  sintoma: string; // 'Pierde presion de impacto'
  arbol: NodoDiagnostico; // arbol binario/n-ario de preguntas
}

export interface NodoDiagnostico {
  pregunta?: string;
  opciones?: { etiqueta: string; siguiente: NodoDiagnostico }[];
  resultado?: {
    piezaIds: string[];
    procedimientoId: string;
    nota?: string;
  };
}

export interface Procedimiento {
  id: string;
  titulo: string;
  seguridad: string[]; // advertencias ANTES de empezar, siempre visibles
  herramientas: string[];
  pasos: PasoProcedimiento[];
  duracionMin?: number;
  kitRecomendadoId?: string;
}

export interface PasoProcedimiento {
  orden: number;
  texto: string;
  foto?: string;
  torqueNm?: number;
  advertencia?: string;
}

export interface Kit {
  id: string;
  nombre: string; // 'Kit de servicio 500 hrs'
  partNumber: string;
  piezaIds: string[];
}

export interface AssetManifest {
  ruta: string; // relativa al pack, ej 'assets/xxx.png'
  hash: string; // sha256 hex
  kb: number;
}
