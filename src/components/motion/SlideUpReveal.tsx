"use client";

import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import LineAliveEmbed from "@/components/media/LineAliveEmbed";
import { isLikelyLineAliveHtmlUrl, resolvePublicLineAliveSrc } from "@/lib/linealive/utils";

export type SlideUpRevealProps = {
  mediaUrl: string;
  duracionDeslizamientoMs?: number;
  onComplete?: () => void;
  children: ReactNode;
};

/**
 * Tras finalizar el media inicial, la portada (children) sube desde abajo
 * cubriendo el último fotograma del media hasta ocupar toda la ventana.
 */
export default function SlideUpReveal({ mediaUrl, duracionDeslizamientoMs = 900, onComplete, children }: SlideUpRevealProps) {
  const [sliding, setSliding] = useState(false);
  const [mediaHidden, setMediaHidden] = useState(false);
  const isHtml = isLikelyLineAliveHtmlUrl(mediaUrl);
  const resolvedSrc = isHtml ? resolvePublicLineAliveSrc(mediaUrl) : mediaUrl;

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
    <div className="relative h-full w-full overflow-hidden bg-[var(--brown-dark)]">
      {!mediaHidden ? (
        <div className="absolute inset-0 z-0">
          {isHtml ? (
            <LineAliveEmbed
              src={resolvedSrc}
              title="Animación de introducción"
              fit="cover"
              lockAspectRatio={false}
              className="h-full w-full rounded-none border-0 bg-transparent"
              iframeClassName="rounded-none"
              loadingLabel=""
              onEnded={startSlide}
            />
          ) : (
            <img src={resolvedSrc} alt="" className="h-full w-full object-cover" onLoad={startSlide} />
          )}
        </div>
      ) : null}
      <div className="absolute inset-0 z-10" style={slideStyle}>
        {children}
      </div>
    </div>
  );
}
