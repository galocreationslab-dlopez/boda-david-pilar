"use client";

import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import IntroMediaStage from "@/components/motion/IntroMediaStage";

export type SlideUpRevealProps = {
  mediaUrl: string;
  fondo?: string;
  duracionDeslizamientoMs?: number;
  maxEsperaMs?: number;
  onComplete?: () => void;
  children: ReactNode;
};

/**
 * Tras finalizar el media inicial, la portada (children) sube desde abajo
 * cubriendo el último fotograma del media hasta ocupar toda la ventana.
 */
export default function SlideUpReveal({ mediaUrl, fondo, duracionDeslizamientoMs = 900, maxEsperaMs = 9000, onComplete, children }: SlideUpRevealProps) {
  const [sliding, setSliding] = useState(false);
  const [mediaHidden, setMediaHidden] = useState(false);

  const startSlide = useCallback(() => {
    setSliding(true);
    window.setTimeout(() => {
      setMediaHidden(true);
      onComplete?.();
    }, Math.max(200, duracionDeslizamientoMs));
  }, [duracionDeslizamientoMs, onComplete]);

  const slideStyle: CSSProperties = {
    transform: sliding ? "translateY(0)" : "translateY(100%)",
    transition: `transform ${duracionDeslizamientoMs}ms cubic-bezier(0.22,1,0.36,1)`,
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: fondo }}>
      {!mediaHidden ? (
        <IntroMediaStage mediaUrl={mediaUrl} fondo={fondo} maxEsperaMs={maxEsperaMs} onReady={startSlide} className="absolute inset-0 z-0 h-full w-full" />
      ) : null}
      <div className="absolute inset-0 z-10" style={slideStyle}>
        {children}
      </div>
    </div>
  );
}
