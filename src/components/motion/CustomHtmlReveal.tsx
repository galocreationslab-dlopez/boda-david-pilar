"use client";

import { useCallback, useState, type ReactNode } from "react";
import LineAliveEmbed from "@/components/media/LineAliveEmbed";
import { resolvePublicLineAliveSrc } from "@/lib/linealive/utils";

export type CustomHtmlRevealProps = {
  htmlUrl: string;
  duracionFadeMs?: number;
  onComplete?: () => void;
  children: ReactNode;
};

/**
 * Carga un HTML propio a pantalla completa (usa el mismo protocolo de
 * LineAlive: postMessage {source:"linealive-player", type:"ended"}). Cuando
 * el HTML avisa que ha terminado, se hace fade-in de la portada.
 */
export default function CustomHtmlReveal({ htmlUrl, duracionFadeMs = 500, onComplete, children }: CustomHtmlRevealProps) {
  const [fading, setFading] = useState(false);
  const [mediaHidden, setMediaHidden] = useState(false);
  const resolvedSrc = resolvePublicLineAliveSrc(htmlUrl);

  const startFade = useCallback(() => {
    setFading(true);
    window.setTimeout(() => {
      setMediaHidden(true);
      onComplete?.();
    }, Math.max(150, duracionFadeMs));
  }, [duracionFadeMs, onComplete]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--brown-dark)]">
      <div className="absolute inset-0 z-0" style={{ transition: `opacity ${duracionFadeMs}ms ease-in-out`, opacity: fading ? 1 : 0 }}>
        {children}
      </div>
      {!mediaHidden ? (
        <div className="absolute inset-0 z-10" style={{ transition: `opacity ${duracionFadeMs}ms ease-in-out`, opacity: fading ? 0 : 1 }}>
          <LineAliveEmbed
            src={resolvedSrc}
            title="Animación de introducción personalizada"
            fit="cover"
            lockAspectRatio={false}
            className="h-full w-full rounded-none border-0 bg-transparent"
            iframeClassName="rounded-none"
            loadingLabel=""
            onEnded={startFade}
          />
        </div>
      ) : null}
    </div>
  );
}
