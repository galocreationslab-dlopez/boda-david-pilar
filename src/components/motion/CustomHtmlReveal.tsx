"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import LineAliveEmbed from "@/components/media/LineAliveEmbed";
import { resolvePublicLineAliveSrc } from "@/lib/linealive/utils";

export type CustomHtmlRevealProps = {
  htmlUrl: string;
  fondo?: string;
  duracionFadeMs?: number;
  maxEsperaMs?: number;
  onComplete?: () => void;
  children: ReactNode;
};

/**
 * Carga un HTML propio a pantalla completa (usa el mismo protocolo de
 * LineAlive: postMessage {source:"linealive-player", type:"ended"}). Cuando
 * el HTML avisa que ha terminado (o pasa el tiempo máximo de espera), esa
 * capa se desvanece revelando la portada que ya estaba montada detrás.
 */
export default function CustomHtmlReveal({ htmlUrl, fondo, duracionFadeMs = 500, maxEsperaMs = 20000, onComplete, children }: CustomHtmlRevealProps) {
  const [fading, setFading] = useState(false);
  const [mediaHidden, setMediaHidden] = useState(false);
  const firedRef = useRef(false);
  const resolvedSrc = resolvePublicLineAliveSrc(htmlUrl);

  const startFade = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    setFading(true);
    window.setTimeout(() => {
      setMediaHidden(true);
      onComplete?.();
    }, Math.max(150, duracionFadeMs));
  }, [duracionFadeMs, onComplete]);

  useEffect(() => {
    firedRef.current = false;
    const timer = window.setTimeout(startFade, Math.max(2000, maxEsperaMs));
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlUrl, maxEsperaMs]);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: fondo }}>
      <div className="absolute inset-0 z-0">{children}</div>
      {!mediaHidden ? (
        <div className="absolute inset-0 z-10" style={{ transition: `opacity ${duracionFadeMs}ms ease-in-out`, opacity: fading ? 0 : 1 }}>
          <LineAliveEmbed
            src={resolvedSrc}
            title="Animación de introducción personalizada"
            fit="cover"
            lockAspectRatio={false}
            className="h-full w-full rounded-none border-0"
            iframeClassName="rounded-none"
            loadingLabel=""
            onEnded={startFade}
          />
        </div>
      ) : null}
    </div>
  );
}
