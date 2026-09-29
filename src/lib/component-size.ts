/**
 * lib/component-size.ts
 * Clasifica que componentes de diseno admiten un control de tamano (slider) en el
 * panel de administracion, y cuales son sus valores/rangos por defecto.
 * "font": ajusta el tamano de fuente en px.
 * "width": ajusta el ancho aplicando una escala uniforme (mantiene la relacion de aspecto).
 */
import type { CSSProperties } from "react";

export type ComponentSizeKind = "font" | "width";

export const COMPONENT_SIZE_KIND: Partial<Record<string, ComponentSizeKind>> = {
  "portada.logo": "width",
  "portada.nombres": "font",
  "portada.fecha": "font",
  "portada.bienvenida": "font",
  "portada.faltan": "font",
  "portada.cuentaAtras": "font",
  "portada.cuentaAtrasLeyendas": "font",
  "portada.ctaTexto": "font",
  "historia.tituloSeccion": "font",
  "historia.tituloInterno": "font",
  "historia.fecha": "font",
  "historia.titulo": "font",
  "historia.descripcion": "font",
  "historia.navegacion": "font",
  "timeline.tituloSeccion": "font",
  "timeline.icono": "width",
  "timeline.hora": "font",
  "timeline.titulo": "font",
  "timeline.descripcion": "font",
  "galeria.tituloSeccion": "font",
  "galeria.titulo": "font",
  "galeria.subtitulo": "font",
};

// Tamano actual aproximado (px) de cada componente, usado como valor inicial del slider.
const COMPONENT_DEFAULT_SIZE_PX: Partial<Record<string, number>> = {
  "portada.logo": 128,
  "portada.nombres": 64,
  "portada.fecha": 14,
  "portada.bienvenida": 20,
  "portada.faltan": 12,
  "portada.cuentaAtras": 36,
  "portada.cuentaAtrasLeyendas": 12,
  "portada.ctaTexto": 14,
  "historia.tituloSeccion": 20,
  "historia.tituloInterno": 32,
  "historia.fecha": 12,
  "historia.titulo": 30,
  "historia.descripcion": 18,
  "historia.navegacion": 13,
  "timeline.tituloSeccion": 20,
  "timeline.icono": 22,
  "timeline.hora": 20,
  "timeline.titulo": 20,
  "timeline.descripcion": 14,
  "galeria.tituloSeccion": 20,
  "galeria.titulo": 20,
  "galeria.subtitulo": 12,
};

export const COMPONENT_SIZE_RANGE: Record<ComponentSizeKind, { min: number; max: number; step: number }> = {
  font: { min: 8, max: 96, step: 1 },
  width: { min: 16, max: 320, step: 2 },
};

export function getComponentSizeKind(key: string): ComponentSizeKind | undefined {
  return COMPONENT_SIZE_KIND[key];
}

export function getComponentDefaultSize(key: string): number {
  return COMPONENT_DEFAULT_SIZE_PX[key] ?? (COMPONENT_SIZE_KIND[key] === "width" ? 64 : 16);
}

export function getComponentSizeStyle(key: string, storedValue: number | undefined): CSSProperties {
  const kind = getComponentSizeKind(key);
  if (!kind) return {};
  const defaultPx = getComponentDefaultSize(key);
  const value = storedValue ?? defaultPx;
  if (kind === "font") return { fontSize: `${value}px` };
  const scale = defaultPx > 0 ? value / defaultPx : 1;
  return { transform: `scale(${Number(scale.toFixed(3))})` };
}
