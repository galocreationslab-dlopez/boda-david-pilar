"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type LineAliveEmbedProps = {
  src: string;
  title: string;
  aspectRatio?: number;
  restartToken?: number;
  autoPlay?: boolean;
  className?: string;
  iframeClassName?: string;
  loadingLabel?: string;
  onEnded?: () => void;
};

type LineAlivePlayerMessage = {
  source?: string;
  type?: string;
};

function joinClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export default function LineAliveEmbed({
  src,
  title,
  aspectRatio,
  restartToken = 0,
  autoPlay = true,
  className,
  iframeClassName,
  loadingLabel = "Cargando animacion...",
  onEnded,
}: LineAliveEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);

  const sendPlayerCommand = useCallback((action: string, payload?: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "linealive-control",
        action,
        payload,
      },
      "*",
    );
  }, []);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    const node = iframeRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [src]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<LineAlivePlayerMessage>) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!event.data || event.data.source !== "linealive-player") return;
      if (event.data.type === "ended") {
        onEnded?.();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onEnded]);

  useEffect(() => {
    if (!autoPlay || !loaded || !visible) return;
    const timer = window.setTimeout(() => {
      sendPlayerCommand("play", { from: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [autoPlay, loaded, restartToken, sendPlayerCommand, src, visible]);

  useEffect(() => {
    if (!loaded) return;
    sendPlayerCommand("getState");
  }, [loaded, sendPlayerCommand, restartToken]);

  return (
    <div
      className={joinClassNames("relative overflow-hidden rounded-xl border border-[#ddd5cb] bg-white", className)}
      style={aspectRatio ? { aspectRatio: `${aspectRatio}` } : undefined}
    >
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f7f3ee] text-sm text-[var(--brown-mid)]">
          {loadingLabel}
        </div>
      )}
      <iframe
        ref={iframeRef}
        title={title}
        src={src}
        sandbox="allow-scripts"
        className={joinClassNames("h-full w-full", iframeClassName)}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}