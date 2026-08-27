"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type LineAliveEmbedProps = {
  src: string;
  title: string;
  aspectRatio?: number;
  restartToken?: number;
  autoPlay?: boolean;
  fit?: "contain" | "cover";
  lockAspectRatio?: boolean;
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
  fit = "contain",
  lockAspectRatio = true,
  className,
  iframeClassName,
  loadingLabel = "Cargando animacion...",
  onEnded,
}: LineAliveEmbedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const endedNotifiedRef = useRef(false);
  const endedProbeRef = useRef<number | null>(null);
  const stableEndedFramesRef = useRef(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [containerRatio, setContainerRatio] = useState<number | null>(null);
  const currentLoadKey = `${src}::${restartToken}`;
  const loaded = loadedKey === currentLoadKey;

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
    endedNotifiedRef.current = false;
    stableEndedFramesRef.current = 0;
    if (endedProbeRef.current) {
      window.clearInterval(endedProbeRef.current);
      endedProbeRef.current = null;
    }
  }, [src]);

  useEffect(() => {
    endedNotifiedRef.current = false;
    stableEndedFramesRef.current = 0;
  }, [restartToken]);

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
    const node = containerRef.current;
    if (!node) return;

    const updateRatio = () => {
      const { width, height } = node.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setContainerRatio(width / height);
      }
    };

    updateRatio();

    const observer = new ResizeObserver(() => {
      updateRatio();
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [src]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<LineAlivePlayerMessage>) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!event.data || event.data.source !== "linealive-player") return;
      if (event.data.type === "ended") {
        if (endedNotifiedRef.current) return;
        endedNotifiedRef.current = true;
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

      // Fallback para HTMLs de LineAlive que no implementan protocolo postMessage:
      // disparamos click en el boton de replay si existe.
      try {
        const replayButton = iframeRef.current?.contentDocument?.getElementById("replay") as HTMLButtonElement | null;
        replayButton?.click();
      } catch {
        // Ignore cross-origin access errors.
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [autoPlay, loaded, restartToken, sendPlayerCommand, src, visible]);

  useEffect(() => {
    if (!loaded) return;
    sendPlayerCommand("getState");
  }, [loaded, sendPlayerCommand, restartToken]);

  useEffect(() => {
    if (!loaded || !visible || endedNotifiedRef.current) return;

    if (endedProbeRef.current) {
      window.clearInterval(endedProbeRef.current);
      endedProbeRef.current = null;
    }

    const probe = window.setInterval(() => {
      if (endedNotifiedRef.current) {
        window.clearInterval(probe);
        return;
      }

      try {
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return;
        const colorLayer = doc.getElementById("color");
        if (!colorLayer) return;

        const opacity = Number.parseFloat(window.getComputedStyle(colorLayer).opacity || "0");
        if (Number.isFinite(opacity) && opacity >= 0.995) {
          stableEndedFramesRef.current += 1;
        } else {
          stableEndedFramesRef.current = 0;
        }

        if (stableEndedFramesRef.current >= 4) {
          endedNotifiedRef.current = true;
          window.clearInterval(probe);
          onEnded?.();
        }
      } catch {
        // Ignore cross-origin access errors.
      }
    }, 200);

    endedProbeRef.current = probe;

    return () => {
      window.clearInterval(probe);
      if (endedProbeRef.current === probe) {
        endedProbeRef.current = null;
      }
    };
  }, [loaded, onEnded, restartToken, src, visible]);

  const useCover = fit === "cover" && Boolean(aspectRatio) && Boolean(containerRatio);

  let coverStyle: CSSProperties | undefined;
  if (useCover && aspectRatio && containerRatio) {
    if (containerRatio > aspectRatio) {
      coverStyle = {
        width: "100%",
        height: `${(containerRatio / aspectRatio) * 100}%`,
      };
    } else {
      coverStyle = {
        width: `${(aspectRatio / containerRatio) * 100}%`,
        height: "100%",
      };
    }
  }

  return (
    <div
      ref={containerRef}
      className={joinClassNames("relative overflow-hidden", className)}
      style={lockAspectRatio && aspectRatio ? { aspectRatio: `${aspectRatio}` } : undefined}
    >
      {!loaded && loadingLabel && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f7f3ee] text-sm text-[var(--brown-mid)]">
          {loadingLabel}
        </div>
      )}
      <iframe
        ref={iframeRef}
        title={title}
        src={src}
        sandbox="allow-scripts allow-same-origin"
        className={joinClassNames(useCover ? "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" : "h-full w-full", iframeClassName)}
        style={coverStyle}
        onLoad={() => setLoadedKey(currentLoadKey)}
      />
    </div>
  );
}