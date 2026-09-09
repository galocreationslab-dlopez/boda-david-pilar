"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import IntroMediaStage from "@/components/motion/IntroMediaStage";
import { quadToRectMatrix3d, DEFAULT_QUAD, type Quad } from "@/lib/quadTransform";

export type FocusRegionRevealProps = {
  mediaUrl: string;
  region?: Quad;
  fondo?: string;
  duracionZoomMs?: number;
  duracionFadeMs?: number;
  maxEsperaMs?: number;
  onComplete?: () => void;
  children: ReactNode;
};

/**
 * La portada (children) ya está montada debajo, oculta tras el media. Al
 * terminar el media se hace zoom sobre la región cuadrilátera hasta ocupar
 * toda la ventana y, acto seguido, esa capa se desvanece revelando la
 * portada que ya estaba detrás.
 */
export default function FocusRegionReveal({
  mediaUrl,
  region = DEFAULT_QUAD,
  fondo,
  duracionZoomMs = 1400,
  duracionFadeMs = 900,
  maxEsperaMs = 9000,
  onComplete,
  children,
}: FocusRegionRevealProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fading, setFading] = useState(false);
  const [mediaHidden, setMediaHidden] = useState(false);
  const [matrix, setMatrix] = useState<string>("none");

  const markReady = useCallback(() => {
    const el = containerRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const source: Quad = {
      tl: { x: region.tl.x * rect.width, y: region.tl.y * rect.height },
      tr: { x: region.tr.x * rect.width, y: region.tr.y * rect.height },
      br: { x: region.br.x * rect.width, y: region.br.y * rect.height },
      bl: { x: region.bl.x * rect.width, y: region.bl.y * rect.height },
    };
    const nextMatrix = quadToRectMatrix3d(source, rect.width, rect.height);
    // Forzar el navegador a registrar el estado inicial ("none") antes de aplicar
    // la matriz calculada, para que el transition anime desde el principio.
    requestAnimationFrame(() => setMatrix(nextMatrix));

    window.setTimeout(() => {
      setFading(true);
      window.setTimeout(() => {
        setMediaHidden(true);
        onComplete?.();
      }, Math.max(200, duracionFadeMs));
    }, Math.max(200, duracionZoomMs));
  }, [duracionFadeMs, duracionZoomMs, onComplete, region]);

  const mediaTransitionStyle: CSSProperties = {
    transform: matrix,
    transformOrigin: "0 0",
    transition: `transform ${duracionZoomMs}ms ease-in-out`,
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: fondo }}>
      <div className="absolute inset-0 z-0">{children}</div>
      {!mediaHidden ? (
        <div
          className="absolute inset-0 z-10"
          style={{ transition: `opacity ${duracionFadeMs}ms ease-in-out`, opacity: fading ? 0 : 1 }}
        >
          <div ref={containerRef} className="relative h-full w-full overflow-hidden" style={mediaTransitionStyle}>
            <IntroMediaStage mediaUrl={mediaUrl} fondo={fondo} maxEsperaMs={maxEsperaMs} onReady={markReady} className="h-full w-full" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
