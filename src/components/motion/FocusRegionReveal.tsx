"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import LineAliveEmbed from "@/components/media/LineAliveEmbed";
import { isLikelyLineAliveHtmlUrl, resolvePublicLineAliveSrc } from "@/lib/linealive/utils";
import { quadToRectMatrix3d, DEFAULT_QUAD, type Quad } from "@/lib/quadTransform";

export type FocusRegionRevealProps = {
  mediaUrl: string;
  region?: Quad;
  duracionZoomMs?: number;
  duracionFadeMs?: number;
  onComplete?: () => void;
  children: ReactNode;
};

/**
 * Muestra un media (imagen o LineAlive) y, al terminar su dibujo, hace zoom
 * sobre una región cuadrilátera hasta que ocupa toda la ventana —como si esa
 * región fuese una "ventana" que revela la portada mediante un fade-in.
 */
export default function FocusRegionReveal({
  mediaUrl,
  region = DEFAULT_QUAD,
  duracionZoomMs = 1400,
  duracionFadeMs = 900,
  onComplete,
  children,
}: FocusRegionRevealProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [fading, setFading] = useState(false);
  const [mediaHidden, setMediaHidden] = useState(false);
  const [matrix, setMatrix] = useState<string>("none");

  const isHtml = isLikelyLineAliveHtmlUrl(mediaUrl);
  const resolvedSrc = isHtml ? resolvePublicLineAliveSrc(mediaUrl) : mediaUrl;

  const markReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    const el = containerRef.current;
    if (!el) return;
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
    requestAnimationFrame(() => {
      setMatrix(nextMatrix);
    });

    const zoomTimer = window.setTimeout(() => {
      setFading(true);
      const fadeTimer = window.setTimeout(() => {
        setMediaHidden(true);
        onComplete?.();
      }, Math.max(200, duracionFadeMs));
      return () => window.clearTimeout(fadeTimer);
    }, Math.max(200, duracionZoomMs));

    return () => window.clearTimeout(zoomTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const mediaTransitionStyle: CSSProperties = {
    transform: matrix,
    transformOrigin: "0 0",
    transition: `transform ${duracionZoomMs}ms ease-in-out`,
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--brown-dark)]">
      <div className="absolute inset-0 z-0" style={{ transition: `opacity ${duracionFadeMs}ms ease-in-out`, opacity: fading ? 1 : 0 }}>
        {children}
      </div>
      {!mediaHidden ? (
        <div
          className="absolute inset-0 z-10"
          style={{ transition: `opacity ${duracionFadeMs}ms ease-in-out`, opacity: fading ? 0 : 1 }}
        >
          <div ref={containerRef} className="relative h-full w-full overflow-hidden" style={mediaTransitionStyle}>
            {isHtml ? (
              <LineAliveEmbed
                src={resolvedSrc}
                title="Animación de introducción"
                fit="cover"
                lockAspectRatio={false}
                className="h-full w-full rounded-none border-0 bg-transparent"
                iframeClassName="rounded-none"
                loadingLabel=""
                onEnded={markReady}
              />
            ) : (
              <img src={resolvedSrc} alt="" className="h-full w-full object-cover" onLoad={markReady} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
