/**
 * lib/portada-libre.ts
 * Valores por defecto y utilidades de la seccion "Portada" de formato libre.
 * Seguro para cliente y servidor.
 */
import type {
  PortadaDispositivoConfig,
  PortadaElemento,
  PortadaElementoLayout,
  PortadaLibreConfig,
} from "@/config/wedding.config";

export type PortadaDispositivo = "pc" | "movil";

// Relacion ancho/alto de una pantalla completa, usada para dibujar el lienzo en el editor.
export const PANTALLA_ASPECTO: Record<PortadaDispositivo, number> = { pc: 16 / 9, movil: 9 / 19 };

// Ancho (px) sobre el que se expresa el tamano de texto de cada elemento.
export const TEXTO_ANCHO_REFERENCIA: Record<PortadaDispositivo, number> = { pc: 1200, movil: 400 };

export const ASPECTOS_PREDEFINIDOS: Array<{ label: string; value: number }> = [
  { label: "16:9", value: 16 / 9 },
  { label: "4:3", value: 4 / 3 },
  { label: "1:1", value: 1 },
  { label: "3:4", value: 3 / 4 },
  { label: "9:16", value: 9 / 16 },
];

export const PORTADA_ALTURA_MIN_PCT = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildDefaultDispositivo(dispositivo: PortadaDispositivo): PortadaDispositivoConfig {
  return dispositivo === "pc"
    ? { alturaModo: "pantallas", aspecto: 16 / 9, pantallas: 1, layout: {} }
    : { alturaModo: "pantallas", aspecto: 9 / 16, pantallas: 1, layout: {} };
}

export function buildDefaultPortadaLibre(): PortadaLibreConfig {
  return {
    elementos: [],
    colapsable: true,
    mostrarTitulo: false,
    abiertaPorDefecto: true,
    pc: buildDefaultDispositivo("pc"),
    movil: buildDefaultDispositivo("movil"),
  };
}

export function normalizePortadaLibre(config?: PortadaLibreConfig): PortadaLibreConfig {
  const base = buildDefaultPortadaLibre();
  if (!config) return base;
  return {
    ...base,
    ...config,
    elementos: Array.isArray(config.elementos) ? config.elementos : [],
    pc: { ...base.pc, ...config.pc, layout: { ...(config.pc?.layout ?? {}) } },
    movil: { ...base.movil, ...config.movil, layout: { ...(config.movil?.layout ?? {}) } },
  };
}

/** Posicion inicial de un elemento nuevo; el indice escalona los elementos para que no se tapen del todo. */
export function buildDefaultLayout(
  elemento: PortadaElemento,
  dispositivo: PortadaDispositivo,
  index: number,
): PortadaElementoLayout {
  const offset = (index % 6) * 4;
  if (elemento.tipo === "texto") {
    return dispositivo === "pc"
      ? { x: 25 + offset, y: 40 + offset, w: 50, h: 20, tamano: 48, fuenteRol: "titulos", alineacion: "center", alineacionVertical: "center", colorModo: "paleta", colorRol: "titulo", z: index + 1 }
      : { x: 10 + offset, y: 40 + offset, w: 80, h: 12, tamano: 28, fuenteRol: "titulos", alineacion: "center", alineacionVertical: "center", colorModo: "paleta", colorRol: "titulo", z: index + 1 };
  }
  return dispositivo === "pc"
    ? { x: 35 + offset, y: 25 + offset, w: 30, h: 50, colorModo: "original", ajuste: "contain", z: index + 1 }
    : { x: 20 + offset, y: 30 + offset, w: 60, h: 25, colorModo: "original", ajuste: "contain", z: index + 1 };
}

export function getElementoLayout(
  config: PortadaLibreConfig,
  dispositivo: PortadaDispositivo,
  elemento: PortadaElemento,
  index: number,
): PortadaElementoLayout {
  return config[dispositivo].layout[elemento.id] ?? buildDefaultLayout(elemento, dispositivo, index);
}

/** Numero de pantallas completas que ocupa el lienzo en modo "pantallas" (0 = automatico). */
export function getPantallas(config: PortadaLibreConfig, dispositivo: PortadaDispositivo): number {
  const disp = config[dispositivo];
  const fijo = Math.floor(disp.pantallas ?? 1);
  if (fijo > 0) return clamp(fijo, 1, 20);
  const bottom = config.elementos.reduce((max, elemento, index) => {
    const layout = getElementoLayout(config, dispositivo, elemento, index);
    return layout.oculto ? max : Math.max(max, layout.y + layout.h);
  }, 0);
  return clamp(Math.ceil(bottom / 100 - 0.001), 1, 20);
}

export function clampLayout(layout: PortadaElementoLayout, maxY: number): PortadaElementoLayout {
  const w = clamp(layout.w, 1, 200);
  const h = clamp(layout.h, PORTADA_ALTURA_MIN_PCT, maxY);
  return {
    ...layout,
    w,
    h,
    x: clamp(layout.x, -w + 5, 100 - 5),
    y: clamp(layout.y, -h + 5, maxY - 5),
  };
}
