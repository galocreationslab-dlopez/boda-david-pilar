"use client";

import { useCallback, useRef, useState } from "react";
import type { IntroRegionCuadrilatero } from "@/config/wedding.config";

type VertexKey = keyof IntroRegionCuadrilatero;

const VERTEX_ORDER: VertexKey[] = ["tl", "tr", "br", "bl"];
const VERTEX_LABELS: Record<VertexKey, string> = {
  tl: "Superior izquierda",
  tr: "Superior derecha",
  br: "Inferior derecha",
  bl: "Inferior izquierda",
};

export const DEFAULT_REGION: IntroRegionCuadrilatero = {
  tl: { x: 0.2, y: 0.2 },
  tr: { x: 0.8, y: 0.2 },
  br: { x: 0.8, y: 0.8 },
  bl: { x: 0.2, y: 0.8 },
};

type Props = {
  previewSrc: string;
  isHtml: boolean;
  value?: IntroRegionCuadrilatero;
  onChange: (region: IntroRegionCuadrilatero) => void;
};

/**
 * Editor visual para definir el polígono de 4 vértices ("focusRegion"):
 * arrastra cada vértice sobre la vista previa del media. Las coordenadas se
 * guardan normalizadas (0-1) respecto al tamaño del contenedor.
 */
export default function PolygonRegionEditor({ previewSrc, isHtml, value, onChange }: Props) {
  const region = value ?? DEFAULT_REGION;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<VertexKey | null>(null);

  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

  const updateFromPointer = useCallback(
    (key: VertexKey, clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clamp01((clientX - rect.left) / rect.width);
      const y = clamp01((clientY - rect.top) / rect.height);
      onChange({ ...region, [key]: { x, y } });
    },
    [onChange, region],
  );

  const handlePointerDown = (key: VertexKey) => (event: React.PointerEvent<SVGCircleElement>) => {
    event.preventDefault();
    (event.target as Element).setPointerCapture(event.pointerId);
    setDragging(key);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateFromPointer(dragging, event.clientX, event.clientY);
  };

  const handlePointerUp = () => setDragging(null);

  const points = VERTEX_ORDER.map((key) => `${region[key].x * 100},${region[key].y * 100}`).join(" ");

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative aspect-video w-full select-none overflow-hidden rounded-xl border border-stone-300 bg-stone-900"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {previewSrc ? (
          isHtml ? (
            <iframe src={previewSrc} title="Vista previa" className="pointer-events-none h-full w-full border-0" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt="Vista previa" className="pointer-events-none h-full w-full object-cover" />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">
            Selecciona un recurso para previsualizar la región
          </div>
        )}

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <polygon points={points} fill="rgba(196,150,74,0.28)" stroke="#C4964A" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
        </svg>

        {VERTEX_ORDER.map((key) => (
          <svg key={key} viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            <circle
              cx={region[key].x * 100}
              cy={region[key].y * 100}
              r={2.2}
              fill="#C4964A"
              stroke="#2E1F0E"
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
              className="cursor-grab pointer-events-auto active:cursor-grabbing"
              onPointerDown={handlePointerDown(key)}
            />
          </svg>
        ))}
      </div>
      <p className="text-xs text-stone-500">
        Arrastra los 4 vértices ({VERTEX_ORDER.map((k) => VERTEX_LABELS[k]).join(" · ")}) para definir la región sobre la que se hará zoom.
      </p>
    </div>
  );
}
