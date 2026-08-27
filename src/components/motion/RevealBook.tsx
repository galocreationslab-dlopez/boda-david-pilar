"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AutoDrawSVG from "@/components/motion/AutoDrawSVG";
import LineAliveEmbed from "@/components/media/LineAliveEmbed";

type RevealPanel = {
  svgSource: string;
  alt: string;
};

export type RevealBookProps = {
  panelIzquierdo: RevealPanel;
  panelDerecho: RevealPanel;
  children: ReactNode;
  duracionAperturaMs?: number;
  pausaAntesDeAbrirMs?: number;
  maxEsperaDibujoMs?: number;
  onComplete?: () => void;
  colorMarco?: string;
  tintColor?: string;
  fondoPanel?: string;
  fullBleedPanels?: boolean;
};

const MAX_ESPERA_DIBUJO_MS = 15000;

function isLikelyLineAliveHtmlUrl(value: string): boolean {
  const raw = value.trim().toLowerCase();
  if (!raw) return false;
  return raw.endsWith(".html") || raw.endsWith(".htm") || raw.includes("/linealive/html") || raw.includes("_la.html");
}

function extractDriveFileId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(value)) return value;

  try {
    const parsed = new URL(value, "http://localhost");
    const fileIdFromQuery = parsed.searchParams.get("fileId")?.trim();
    if (fileIdFromQuery && /^[a-zA-Z0-9_-]{20,}$/.test(fileIdFromQuery)) {
      return fileIdFromQuery;
    }

    const idFromQuery = parsed.searchParams.get("id")?.trim();
    if (idFromQuery && /^[a-zA-Z0-9_-]{20,}$/.test(idFromQuery)) {
      return idFromQuery;
    }

    const fileMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
    if (fileMatch?.[1]) {
      return fileMatch[1];
    }

    const genericMatch = parsed.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/i);
    if (genericMatch?.[1]) {
      return genericMatch[1];
    }
  } catch {
    return null;
  }

  return null;
}

function resolvePublicLineAliveSrc(raw: string): string {
  if (raw.includes("/api/linealive/html")) return raw;

  const fileId = extractDriveFileId(raw);
  if (fileId) {
    return `/api/linealive/html?fileId=${encodeURIComponent(fileId)}`;
  }

  const value = raw.trim();
  if (!value) return raw;

  try {
    const parsed = new URL(value, "http://localhost");
    if (/^\/LineAlive\/.+\.html?$/i.test(parsed.pathname)) {
      return `/api/linealive/html?path=${encodeURIComponent(parsed.pathname)}`;
    }
  } catch {
    return raw;
  }

  return raw;
}

export default function RevealBook({
  panelIzquierdo,
  panelDerecho,
  children,
  duracionAperturaMs = 1800,
  pausaAntesDeAbrirMs = 120,
  maxEsperaDibujoMs = MAX_ESPERA_DIBUJO_MS,
  colorMarco = "#d8cec0",
  tintColor,
  fondoPanel = "var(--brown-dark)",
  fullBleedPanels = false,
  onComplete,
}: RevealBookProps) {
  const [izquierdoListo, setIzquierdoListo] = useState(false);
  const [derechoListo, setDerechoListo] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [contenidoVisible, setContenidoVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const timersRef = useRef<number[]>([]);

  const markLeftReady = useCallback(() => setIzquierdoListo(true), []);
  const markRightReady = useCallback(() => setDerechoListo(true), []);

  const leftIsHtml = isLikelyLineAliveHtmlUrl(panelIzquierdo.svgSource);
  const rightIsHtml = isLikelyLineAliveHtmlUrl(panelDerecho.svgSource);
  const leftHtmlSrc = leftIsHtml ? resolvePublicLineAliveSrc(panelIzquierdo.svgSource) : panelIzquierdo.svgSource;
  const rightHtmlSrc = rightIsHtml ? resolvePublicLineAliveSrc(panelDerecho.svgSource) : panelDerecho.svgSource;
  const leftReady = izquierdoListo;
  const rightReady = derechoListo;

  const panelStyle = useMemo(() => (tintColor ? { color: tintColor } : undefined), [tintColor]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    for (const timer of timersRef.current) {
      window.clearTimeout(timer);
    }
    timersRef.current = [];

    if (reduceMotion) {
      return;
    }

    // Fallback para SVGs extremadamente pesados: si el autodibujado tarda demasiado,
    // no bloqueamos la narrativa y permitimos abrir el libro igualmente.
    const failSafeTimer = window.setTimeout(() => {
      setIzquierdoListo(true);
      setDerechoListo(true);
    }, Math.max(2000, maxEsperaDibujoMs));
    timersRef.current.push(failSafeTimer);
  }, [maxEsperaDibujoMs, panelIzquierdo.svgSource, panelDerecho.svgSource, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    if (!leftReady || !rightReady) return;

    // Coreografia:
    // 1) esperamos a que ambos AutoDrawSVG terminen,
    // 2) aplicamos una pausa corta para respirar la escena,
    // 3) abrimos hojas en 3D,
    // 4) al terminar la apertura mostramos el contenido con fade-in.
    const startTimer = window.setTimeout(() => {
      setAbriendo(true);

      const contentTimer = window.setTimeout(() => {
        setContenidoVisible(true);
      }, Math.max(200, duracionAperturaMs));
      timersRef.current.push(contentTimer);
    }, pausaAntesDeAbrirMs);

    timersRef.current.push(startTimer);

    return () => {
      for (const timer of timersRef.current) {
        window.clearTimeout(timer);
      }
      timersRef.current = [];
    };
  }, [duracionAperturaMs, leftReady, pausaAntesDeAbrirMs, reduceMotion, rightReady]);

  useEffect(() => {
    if (!contenidoVisible && !reduceMotion) return;
    onComplete?.();
  }, [contenidoVisible, onComplete, reduceMotion]);

  const leftTransform = abriendo ? "rotateY(-112deg)" : "rotateY(0deg)";
  const rightTransform = abriendo ? "rotateY(112deg)" : "rotateY(0deg)";

  // El componente es transversal: no asume portada, historia ni timeline.
  // Solo revela children, que puede ser cualquier composicion inyectada por props.
  return (
    <div className="h-full w-full">
      <div
        className={fullBleedPanels
          ? "relative h-full w-full overflow-hidden bg-transparent"
          : "relative h-full w-full overflow-hidden border bg-transparent shadow-[0_20px_55px_rgba(0,0,0,0.14)]"}
        style={{ borderColor: colorMarco }}
      >
        <div className="relative h-full min-h-0">
          <div
            className="absolute inset-0 z-0 overflow-auto"
          >
            {children}
          </div>

          {!reduceMotion && (
            <div
              className="absolute inset-0 z-10"
              style={{
                perspective: "900px",
              }}
            >
              <div
                className={fullBleedPanels ? "absolute inset-y-0 left-0 w-1/2" : "absolute inset-y-0 left-0 w-1/2 border-r"}
                style={{
                  borderColor: colorMarco,
                  transformOrigin: "left center",
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  transform: leftTransform,
                  transition: `transform ${duracionAperturaMs}ms cubic-bezier(0.2, 0.72, 0.2, 1)`,
                }}
              >
                <div className={fullBleedPanels ? "h-full w-full" : "h-full w-full p-3 sm:p-4"} style={{ ...panelStyle, backgroundColor: fondoPanel }} role="img" aria-label={panelIzquierdo.alt}>
                  <div className={fullBleedPanels ? "flex h-full w-full items-center justify-center overflow-hidden" : "flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)]"} style={{ backgroundColor: fondoPanel }}>
                    {leftIsHtml ? (
                      <LineAliveEmbed
                        src={leftHtmlSrc}
                        title={panelIzquierdo.alt}
                        fit="cover"
                        lockAspectRatio={false}
                        className="h-full w-full rounded-none border-0 bg-transparent"
                        iframeClassName="rounded-none"
                        loadingLabel=""
                        onEnded={markLeftReady}
                      />
                    ) : (
                      <AutoDrawSVG
                        svgSource={panelIzquierdo.svgSource}
                        onComplete={markLeftReady}
                        durationMs={650}
                        staggerMs={24}
                        sequential={false}
                        respectReducedMotion
                      />
                    )}
                  </div>
                </div>
              </div>

              <div
                className={fullBleedPanels ? "absolute inset-y-0 right-0 w-1/2" : "absolute inset-y-0 right-0 w-1/2 border-l"}
                style={{
                  borderColor: colorMarco,
                  transformOrigin: "right center",
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  transform: rightTransform,
                  transition: `transform ${duracionAperturaMs}ms cubic-bezier(0.2, 0.72, 0.2, 1)`,
                }}
              >
                <div className={fullBleedPanels ? "h-full w-full" : "h-full w-full p-3 sm:p-4"} style={{ ...panelStyle, backgroundColor: fondoPanel }} role="img" aria-label={panelDerecho.alt}>
                  <div className={fullBleedPanels ? "flex h-full w-full items-center justify-center overflow-hidden" : "flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)]"} style={{ backgroundColor: fondoPanel }}>
                    {rightIsHtml ? (
                      <LineAliveEmbed
                        src={rightHtmlSrc}
                        title={panelDerecho.alt}
                        fit="cover"
                        lockAspectRatio={false}
                        className="h-full w-full rounded-none border-0 bg-transparent"
                        iframeClassName="rounded-none"
                        loadingLabel=""
                        onEnded={markRightReady}
                      />
                    ) : (
                      <AutoDrawSVG
                        svgSource={panelDerecho.svgSource}
                        onComplete={markRightReady}
                        durationMs={650}
                        staggerMs={24}
                        sequential={false}
                        respectReducedMotion
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
