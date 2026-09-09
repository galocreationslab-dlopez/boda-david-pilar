"use client";

import { useEffect, useRef } from "react";
import LineAliveEmbed from "@/components/media/LineAliveEmbed";
import { isLikelyLineAliveHtmlUrl, resolvePublicLineAliveSrc } from "@/lib/linealive/utils";

export type IntroMediaStageProps = {
  mediaUrl: string;
  /** Fondo opaco tras el media (evita que se transparente la portada mientras carga/dibuja). */
  fondo?: string;
  /** Failsafe: si el media nunca avisa que terminó, se continúa igualmente. */
  maxEsperaMs?: number;
  onReady: () => void;
  className?: string;
};

/**
 * Parte "b" de la intro: pinta el media (imagen o LineAlive) configurado,
 * independientemente de qué transición ("c") se use luego para revelar la
 * portada. Aislar esto aquí permite en el futuro configurar el media por
 * separado de la transición.
 */
export default function IntroMediaStage({ mediaUrl, fondo, maxEsperaMs = 9000, onReady, className }: IntroMediaStageProps) {
  const firedRef = useRef(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const isHtml = isLikelyLineAliveHtmlUrl(mediaUrl);
  const resolvedSrc = isHtml ? resolvePublicLineAliveSrc(mediaUrl) : mediaUrl;

  const fireOnce = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onReadyRef.current();
  };

  useEffect(() => {
    firedRef.current = false;
    const timer = window.setTimeout(fireOnce, Math.max(1000, maxEsperaMs));
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaUrl, maxEsperaMs]);

  return (
    <div className={className} style={{ backgroundColor: fondo }}>
      {isHtml ? (
        <LineAliveEmbed
          src={resolvedSrc}
          title="Animación de introducción"
          fit="cover"
          lockAspectRatio={false}
          className="h-full w-full rounded-none border-0"
          iframeClassName="rounded-none"
          loadingLabel=""
          onEnded={fireOnce}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolvedSrc} alt="" className="h-full w-full object-cover" onLoad={fireOnce} />
      )}
    </div>
  );
}
