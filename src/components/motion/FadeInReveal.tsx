"use client";

import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import LineAliveEmbed from "@/components/media/LineAliveEmbed";
import { isLikelyLineAliveHtmlUrl, resolvePublicLineAliveSrc } from "@/lib/linealive/utils";

export type FadeInRevealProps = {
  mediaUrl: string;
  duracionFadeMs?: number;
  onComplete?: () => void;
  children: ReactNode;
};

/**
 * Tras finalizar el media inicial (imagen o LineAlive), este se desvanece
 * mientras la portada (children) gana opacidad, hasta que solo se ve esta.
 */
export default function FadeInReveal({ mediaUrl, duracionFadeMs = 1200, onComplete, children }: FadeInRevealProps) {
  const [fading, setFading] = useState(false);
  const [mediaHidden, setMediaHidden] = useState(false);
  const isHtml = isLikelyLineAliveHtmlUrl(mediaUrl);
  const resolvedSrc = isHtml ? resolvePublicLineAliveSrc(mediaUrl) : mediaUrl;

  const startFade = useCallback(() => {
    setFading(true);
    window.setTimeout(() => {
      setMediaHidden(true);
      onComplete?.();
    }, Math.max(200, duracionFadeMs));
  }, [duracionFadeMs, onComplete]);

  const transitionStyle: CSSProperties = { transition: `opacity ${duracionFadeMs}ms ease-in-out` };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--brown-dark)]">
      <div className="absolute inset-0 z-0" style={{ ...transitionStyle, opacity: fading ? 0 : 1 }}>
        {children}
      </div>
      {!mediaHidden ? (
        <div className="absolute inset-0 z-10" style={{ ...transitionStyle, opacity: fading ? 0 : 1 }}>
          {isHtml ? (
            <LineAliveEmbed
              src={resolvedSrc}
              title="Animación de introducción"
              fit="cover"
              lockAspectRatio={false}
              className="h-full w-full rounded-none border-0 bg-transparent"
              iframeClassName="rounded-none"
              loadingLabel=""
              onEnded={startFade}
            />
          ) : (
            <img
              src={resolvedSrc}
              alt=""
              className="h-full w-full object-cover"
              onLoad={startFade}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
