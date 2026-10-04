import type { PortadaElementoLayout } from "@/config/wedding.config";

export type PortadaAspectRatio = { width: number; height: number };

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function getPortadaAspectLayout(
  layout: PortadaElementoLayout,
  ratio: PortadaAspectRatio | undefined,
  canvasRatio: number | undefined,
): PortadaElementoLayout {
  if (!layout.mantenerAspecto || !ratio || !finitePositive(ratio.width) || !finitePositive(ratio.height) || !finitePositive(canvasRatio)) return layout;

  const fixed = layout.aspectoFijar === "alto" ? "alto" : "ancho";
  const manualW = finitePositive(layout.aspectoWManual) ? layout.aspectoWManual : layout.w;
  const manualH = finitePositive(layout.aspectoHManual) ? layout.aspectoHManual : layout.h;
  const imageRatio = ratio.width / ratio.height;
  if (!finitePositive(imageRatio)) return layout;

  if (fixed === "ancho") {
    const h = manualW * canvasRatio / imageRatio;
    const alignment = layout.aspectoAlineacion === "abajo" ? "abajo" : layout.aspectoAlineacion === "centroVertical" ? "centro" : "arriba";
    const y = alignment === "abajo" ? layout.y + manualH - h : alignment === "centro" ? layout.y + (manualH - h) / 2 : layout.y;
    return { ...layout, w: manualW, h, y };
  }

  const w = manualH * imageRatio / canvasRatio;
  const alignment = layout.aspectoAlineacion === "derecha" ? "derecha" : layout.aspectoAlineacion === "centroHorizontal" ? "centro" : "izquierda";
  const x = alignment === "derecha" ? layout.x + manualW - w : alignment === "centro" ? layout.x + (manualW - w) / 2 : layout.x;
  return { ...layout, w, h: manualH, x };
}

export function getPortadaAspectCanvasRatio(width: number, height: number): number | undefined {
  return finitePositive(width) && finitePositive(height) ? width / height : undefined;
}