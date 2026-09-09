"use client";

import { useCallback, useState, type ReactNode } from "react";
import IntroMediaStage from "@/components/motion/IntroMediaStage";

export type FadeInRevealProps = {
  mediaUrl: string;
  fondo?: string;
  duracionFadeMs?: number;
  maxEsperaMs?: number;
  onComplete?: () => void;
  children: ReactNode;
};

/**
 * La portada (children) ya está montada debajo, oculta tras el media con
 * fondo opaco. Al terminar el media, toda esa capa se desvanece (opacidad
 * 100→0) revelando la portada que ya estaba detrás.
 */
export default function FadeInReveal({ mediaUrl, fondo, duracionFadeMs = 1200, maxEsperaMs = 9000, onComplete, children }: FadeInRevealProps) {
  const [fading, setFading] = useState(false);
  const [mediaHidden, setMediaHidden] = useState(false);

  const startFade = useCallback(() => {
    setFading(true);
    window.setTimeout(() => {
      setMediaHidden(true);
      onComplete?.();
    }, Math.max(200, duracionFadeMs));
  }, [duracionFadeMs, onComplete]);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: fondo }}>
      <div className="absolute inset-0 z-0">{children}</div>
      {!mediaHidden ? (
        <div className="absolute inset-0 z-10" style={{ opacity: fading ? 0 : 1, transition: `opacity ${duracionFadeMs}ms ease-in-out` }}>
          <IntroMediaStage mediaUrl={mediaUrl} fondo={fondo} maxEsperaMs={maxEsperaMs} onReady={startFade} className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
