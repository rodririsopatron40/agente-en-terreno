import type { VerticalConfig } from '../domain/types';

export interface VerticalListItem {
  id: string;
  nombre: string;
}

// BASE_URL respeta un despliegue en subruta (ej. GitHub Pages).
const BASE = import.meta.env.BASE_URL;

export async function listVerticales(): Promise<VerticalListItem[]> {
  const res = await fetch(`${BASE}config/verticales.json`);
  if (!res.ok) {
    throw new Error(`No se pudo cargar el registro de verticales (HTTP ${res.status})`);
  }
  return (await res.json()) as VerticalListItem[];
}

export async function loadVerticalConfig(id: string): Promise<VerticalConfig> {
  const res = await fetch(`${BASE}config/${id}.json`);
  if (!res.ok) {
    throw new Error(`No se pudo cargar la configuración '${id}' (HTTP ${res.status})`);
  }
  const cfg = (await res.json()) as VerticalConfig;
  assertVerticalConfig(cfg);
  return cfg;
}

// Aplica el branding del rubro a variables CSS. Ningun color de dominio en codigo.
export function applyBranding(cfg: VerticalConfig): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primario', cfg.branding.colorPrimario);
  root.style.setProperty('--color-acento', cfg.branding.colorAcento);
}

function assertVerticalConfig(c: VerticalConfig): void {
  const t = c && c.terminologia;
  const crit = t && t.criticidad;
  const ok =
    c &&
    c.verticalId &&
    c.nombre &&
    c.branding &&
    t &&
    t.activo &&
    t.sitio &&
    t.sistema &&
    t.pieza &&
    t.falla &&
    crit &&
    crit[1] &&
    crit[2] &&
    crit[3];
  if (!ok) {
    throw new Error('vertical.config.json inválido: faltan campos requeridos');
  }
}
