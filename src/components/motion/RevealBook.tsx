"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AutoDrawSVG from "@/components/motion/AutoDrawSVG";
import LineAliveEmbed from "@/components/media/LineAliveEmbed";
import { isLikelyLineAliveHtmlUrl, resolvePublicLineAliveSrc } from "@/lib/linealive/utils";
import { resolveDriveMediaSrc } from "@/lib/drive-image";

type RevealPanel = {
  svgSource?: string;
  alt: string;
};

export type RevealBookProps = {
  panelIzquierdo?: RevealPanel;
  panelDerecho?: RevealPanel;
  children: ReactNode;
  duracionAperturaMs?: number;
  duracionDibujoMs?: number;
  pausaAntesDeAbrirMs?: number;
  maxEsperaDibujoMs?: number;
  onComplete?: () => void;
  colorMarco?: string;
  tintColor?: string;
  fondoPanel?: string;
  fullBleedPanels?: boolean;
  // "libro": paneles giran en 3D (por defecto). "cortinas": paneles se deslizan lateralmente.
  modo?: "libro" | "cortinas";
};

const MAX_ESPERA_DIBUJO_MS = 15000;

function isLineAlivePanelSource(value?: string): boolean {
  if (!value) return false;
  if (isLikelyLineAliveHtmlUrl(value)) return true;

  const raw = value.trim();
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw)) return true;

  try {
    const url = new URL(raw);
    if (url.hostname !== "drive.google.com" && url.hostname !== "drive.usercontent.google.com") return false;
    return /\/file\/d\/[a-zA-Z0-9_-]+/i.test(url.pathname)
      || /\/d\/[a-zA-Z0-9_-]+/i.test(url.pathname)
      || Boolean(url.searchParams.get("id") || url.searchParams.get("fileId"));
  } catch {
    return false;
  }
}

export default function RevealBook({
  panelIzquierdo = { svgSource: "", alt: "" },
  panelDerecho = { svgSource: "", alt: "" },
  children,
  duracionAperturaMs = 1800,
  duracionDibujoMs = 650,
  pausaAntesDeAbrirMs = 120,
  maxEsperaDibujoMs = MAX_ESPERA_DIBUJO_MS,
  colorMarco = "#d8cec0",
  tintColor,
  fondoPanel = "var(--brown-dark)",
  fullBleedPanels = false,
  modo = "libro",
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

  const leftSource = panelIzquierdo.svgSource ?? "";
  const rightSource = panelDerecho.svgSource ?? "";
  const leftHasSource = Boolean(leftSource.trim());
  const rightHasSource = Boolean(rightSource.trim());

  const leftIsHtml = leftHasSource && isLineAlivePanelSource(leftSource);
  const rightIsHtml = rightHasSource && isLineAlivePanelSource(rightSource);
  const leftHtmlSrc = leftIsHtml ? resolvePublicLineAliveSrc(leftSource) : leftSource;
  const rightHtmlSrc = rightIsHtml ? resolvePublicLineAliveSrc(rightSource) : rightSource;
  // La detección de LineAlive (arriba) necesita la URL cruda (Drive/host original); el proxy
  // solo se aplica para el caso SVG, que sí se fetchea directamente en el navegador.
  const leftSvgSrc = leftIsHtml ? "" : resolveDriveMediaSrc(leftSource);
  const rightSvgSrc = rightIsHtml ? "" : resolveDriveMediaSrc(rightSource);
  const leftReady = !leftHasSource || izquierdoListo;
  const rightReady = !rightHasSource || derechoListo;

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

    if (!leftHasSource) setIzquierdoListo(true);
    if (!rightHasSource) setDerechoListo(true);

    // Fallback para SVGs extremadamente pesados: si el autodibujado tarda demasiado,
    // no bloqueamos la narrativa y permitimos abrir el libro igualmente.
    const failSafeTimer = window.setTimeout(() => {
      setIzquierdoListo(true);
      setDerechoListo(true);
    }, Math.max(2000, maxEsperaDibujoMs));
    timersRef.current.push(failSafeTimer);
  }, [leftHasSource, maxEsperaDibujoMs, panelIzquierdo.svgSource, panelDerecho.svgSource, reduceMotion, rightHasSource]);

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

  const leftTransform = modo === "cortinas"
    ? (abriendo ? "translateX(-100%)" : "translateX(0)")
    : (abriendo ? "rotateY(-112deg)" : "rotateY(0deg)");
  const rightTransform = modo === "cortinas"
    ? (abriendo ? "translateX(100%)" : "translateX(0)")
    : (abriendo ? "rotateY(112deg)" : "rotateY(0deg)");

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
                  // ease-in-out: progreso visual proporcional al tiempo, para que coincida con duracionAperturaMs
                  transition: `transform ${duracionAperturaMs}ms ease-in-out`,
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
                    ) : leftHasSource ? (
                      <AutoDrawSVG
                        svgSource={leftSvgSrc}
                        onComplete={markLeftReady}
                        durationMs={duracionDibujoMs}
                        staggerMs={24}
                        sequential={false}
                        respectReducedMotion
                      />
                    ) : null}
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
                  transition: `transform ${duracionAperturaMs}ms ease-in-out`,
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
                    ) : rightHasSource ? (
                      <AutoDrawSVG
                        svgSource={rightSvgSrc}
                        onComplete={markRightReady}
                        durationMs={duracionDibujoMs}
                        staggerMs={24}
                        sequential={false}
                        respectReducedMotion
                      />
                    ) : null}
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
